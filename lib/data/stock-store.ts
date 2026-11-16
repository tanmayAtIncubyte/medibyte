import { products } from "@/data/products";
import { currentScope, scopeTtlSeconds } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";
import { globalSingleton } from "@/lib/data/global-store";

// Available-stock ledger for the order-placement flow, kept in the async KV
// seam (lib/data/backend.ts) as a single reserved-units record at
// `${scope}:stock:reserved`. Scoping gives each candidate their own ledger —
// one candidate's oversell repro can't contaminate another's — and it expires
// with their access window. Seeded from the static product `stock` (the
// reserved ledger starts empty); locally the in-memory backend is wiped on
// restart, returning every product to its seed availability, while the deploy
// backend (Redis) makes a reservation written via /api/checkout visible to a
// later catalog/cart read on a different lambda.
//
// `getAvailableStock(productId)` = seed stock minus everything reserved so far.
// `reserveStock` is the single atomic mutation used at order placement: it
// checks every requested line against current availability and either reserves
// them ALL (decrementing) or NONE (rejecting), so a partial/over-reservation can
// never be committed. This is the CLEAN baseline; the FN_OVERSELL /
// FN_CONCURRENT_DOUBLESPEND bugs toggle this checking/atomicity off at the
// place-order boundary, never inside this store.

type StockLedger = Record<string, number>; // productId -> units reserved

function ledgerKey(scope: string): string {
  return `${scope}:stock:reserved`;
}

async function readLedger(scope: string): Promise<StockLedger> {
  return (await backend().get<StockLedger>(ledgerKey(scope))) ?? {};
}

async function writeLedger(scope: string, ledger: StockLedger): Promise<void> {
  await backend().set(ledgerKey(scope), ledger, scopeTtlSeconds(scope));
}

// The ledger used to be a synchronous Map, so a reservation ran to completion
// with no interleaving. The async KV seam yields between read and write, which
// would open a race window in the CLEAN path too — so every ledger commit is
// serialized through a process-wide promise chain (globalThis-anchored, like
// the backend itself, so route-handler and server-component bundles share it).
// One committed read-modify-write at a time restores the run-to-completion
// guarantee; the racy path keeps its deliberate window OUTSIDE this chain.
const commitLock = globalSingleton("stock-store/commitLock", () => ({
  chain: Promise.resolve() as Promise<unknown>,
}));

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const run = commitLock.chain.then(operation);
  // Keep the chain alive whether or not this operation rejects.
  commitLock.chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function seedStock(productId: string): number {
  const product = products.find((candidate) => candidate.id === productId);
  return product ? product.stock : 0;
}

function availableFrom(ledger: StockLedger, productId: string): number {
  const seed = seedStock(productId);
  const taken = ledger[productId] ?? 0;
  return Math.max(0, seed - taken);
}

/** Units currently available to buy: seed stock minus everything reserved. */
export async function getAvailableStock(productId: string): Promise<number> {
  const scope = await currentScope();
  const ledger = await readLedger(scope);
  return availableFrom(ledger, productId);
}

/** Units already reserved against a product (test/inspection helper). */
export async function getReservedStock(productId: string): Promise<number> {
  const scope = await currentScope();
  const ledger = await readLedger(scope);
  return ledger[productId] ?? 0;
}

export type StockRequestLine = {
  productId: string;
  quantity: number;
};

export type ReserveResult =
  | { ok: true }
  | { ok: false; shortages: { productId: string; requested: number; available: number }[] };

/**
 * Atomically reserves stock for every requested line. All-or-nothing: if ANY
 * line exceeds its current availability, nothing is reserved and the shortages
 * are reported. Otherwise every line is decremented. One read-modify-write
 * with no yield between check and commit, so two sequential calls can never
 * both succeed beyond the seed stock — the foundation the oversell/double-spend
 * bugs deliberately bypass.
 */
export async function reserveStock(
  lines: readonly StockRequestLine[],
): Promise<ReserveResult> {
  const scope = await currentScope();
  return serialized(async () => {
    const ledger = await readLedger(scope);
    const shortages: { productId: string; requested: number; available: number }[] = [];
    for (const line of lines) {
      const requested = Math.max(0, Math.floor(line.quantity));
      const available = availableFrom(ledger, line.productId);
      if (requested > available) {
        shortages.push({ productId: line.productId, requested, available });
      }
    }
    if (shortages.length > 0) {
      return { ok: false, shortages };
    }
    for (const line of lines) {
      const requested = Math.max(0, Math.floor(line.quantity));
      ledger[line.productId] = (ledger[line.productId] ?? 0) + requested;
    }
    await writeLedger(scope, ledger);
    return { ok: true };
  });
}

/**
 * Reserves stock WITHOUT the all-or-nothing pre-check: each line is decremented
 * independently, so availability can be driven negative. Used ONLY by the gated
 * FN_OVERSELL buggy path to let an order exceed available stock. The clean
 * `reserveStock` remains the default.
 */
export async function reserveStockUnchecked(
  lines: readonly StockRequestLine[],
): Promise<ReserveResult> {
  const scope = await currentScope();
  // Serialized so concurrent increments still accumulate (no lost updates);
  // the bug here is the MISSING availability check, not a commit race.
  return serialized(async () => {
    const ledger = await readLedger(scope);
    for (const line of lines) {
      const requested = Math.max(0, Math.floor(line.quantity));
      ledger[line.productId] = (ledger[line.productId] ?? 0) + requested;
    }
    await writeLedger(scope, ledger);
    return { ok: true };
  });
}

// Default check-then-act race window (ms). Wide enough that two near-
// simultaneous HTTP POST /api/checkout requests both land inside the window —
// each reads availability, then both wait out the delay before either commits —
// so a candidate can reproduce the double-spend with a rapid double-submit, not
// just at the microtask level. Tests override this with a tiny delay to stay fast.
export const RACE_WINDOW_MS = 300;

/**
 * Reserves stock with a check-then-act RACE WINDOW: it snapshots availability,
 * waits a real delay (`delayMs`), then commits the decrement using that stale
 * snapshot. Because the wait is a genuine timer rather than a microtask yield,
 * two near-simultaneous callers — including two separate HTTP requests — both
 * pass the check before either commits, double-spending the same units. Used
 * ONLY by the gated FN_CONCURRENT_DOUBLESPEND buggy path; the clean
 * `reserveStock` (one read-modify-write, no yield between check and commit)
 * remains the default and is race-free.
 */
export async function reserveStockRacy(
  lines: readonly StockRequestLine[],
  delayMs: number = RACE_WINDOW_MS,
): Promise<ReserveResult> {
  const scope = await currentScope();
  const snapshot = await readLedger(scope);
  const shortages: { productId: string; requested: number; available: number }[] = [];
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    const available = availableFrom(snapshot, line.productId);
    if (requested > available) {
      shortages.push({ productId: line.productId, requested, available });
    }
  }
  // Wait a real interval AFTER deciding but BEFORE committing — this is the race
  // window the clean atomic path does not have. A genuine timer (not a microtask)
  // keeps the window open long enough for a second HTTP request to also pass the
  // check before this one commits. The decision above deliberately stays OUTSIDE
  // the commit lock.
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
  if (shortages.length > 0) {
    return { ok: false, shortages };
  }
  // Commit the STALE decision: the increments themselves are serialized (so both
  // callers' units land in the ledger additively), but the availability check is
  // long over — which is exactly how the double-spend drives stock negative.
  return serialized(async () => {
    const ledger = await readLedger(scope);
    for (const line of lines) {
      const requested = Math.max(0, Math.floor(line.quantity));
      ledger[line.productId] = (ledger[line.productId] ?? 0) + requested;
    }
    await writeLedger(scope, ledger);
    return { ok: true };
  });
}

/** Resets the ledger to the seed baseline (every product fully available). */
export async function resetStock(): Promise<void> {
  const scope = await currentScope();
  await backend().del(ledgerKey(scope));
}
