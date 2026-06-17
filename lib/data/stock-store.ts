import { products } from "@/data/products";
import { globalSingleton } from "@/lib/data/global-store";

// In-memory available-stock ledger for the order-placement flow. Anchored on
// globalThis (globalSingleton) so the SAME ledger is shared across Next's
// separate API-route and server-component bundles — a reservation made when an
// order is placed via /api/checkout must be visible to a later catalog/cart
// read. Seeded from the static product `stock` and wiped on restart, returning
// every product to its seed availability.
//
// `getAvailableStock(productId)` = seed stock minus everything reserved so far.
// `reserveStock` is the single atomic mutation used at order placement: it
// checks every requested line against current availability and either reserves
// them ALL (decrementing) or NONE (rejecting), so a partial/over-reservation can
// never be committed. This is the CLEAN baseline; the FN_OVERSELL /
// FN_CONCURRENT_DOUBLESPEND bugs toggle this checking/atomicity off at the
// place-order boundary, never inside this store.

type StockLedger = Map<string, number>; // productId -> units reserved

function seedReserved(): StockLedger {
  return new Map<string, number>();
}

const reserved = globalSingleton("stock-store/reserved", seedReserved);

function seedStock(productId: string): number {
  const product = products.find((candidate) => candidate.id === productId);
  return product ? product.stock : 0;
}

/** Units currently available to buy: seed stock minus everything reserved. */
export function getAvailableStock(productId: string): number {
  const seed = seedStock(productId);
  const taken = reserved.get(productId) ?? 0;
  return Math.max(0, seed - taken);
}

/** Units already reserved against a product (test/inspection helper). */
export function getReservedStock(productId: string): number {
  return reserved.get(productId) ?? 0;
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
 * are reported. Otherwise every line is decremented. Synchronous and run to
 * completion with no interleaving, so two sequential calls can never both
 * succeed beyond the seed stock — the foundation the oversell/double-spend bugs
 * deliberately bypass.
 */
export function reserveStock(lines: readonly StockRequestLine[]): ReserveResult {
  const shortages: { productId: string; requested: number; available: number }[] = [];
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    const available = getAvailableStock(line.productId);
    if (requested > available) {
      shortages.push({ productId: line.productId, requested, available });
    }
  }
  if (shortages.length > 0) {
    return { ok: false, shortages };
  }
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    reserved.set(line.productId, (reserved.get(line.productId) ?? 0) + requested);
  }
  return { ok: true };
}

/**
 * Reserves stock WITHOUT the all-or-nothing pre-check: each line is decremented
 * independently, so availability can be driven negative. Used ONLY by the gated
 * FN_OVERSELL buggy path to let an order exceed available stock. The clean
 * `reserveStock` remains the default.
 */
export function reserveStockUnchecked(lines: readonly StockRequestLine[]): ReserveResult {
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    reserved.set(line.productId, (reserved.get(line.productId) ?? 0) + requested);
  }
  return { ok: true };
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
 * ONLY by the gated FN_CONCURRENT_DOUBLESPEND buggy path; the clean synchronous
 * `reserveStock` (no yield between check and commit) remains the default and is
 * race-free.
 */
export async function reserveStockRacy(
  lines: readonly StockRequestLine[],
  delayMs: number = RACE_WINDOW_MS,
): Promise<ReserveResult> {
  const shortages: { productId: string; requested: number; available: number }[] = [];
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    const available = getAvailableStock(line.productId);
    if (requested > available) {
      shortages.push({ productId: line.productId, requested, available });
    }
  }
  // Wait a real interval AFTER deciding but BEFORE committing — this is the race
  // window the clean atomic path does not have. A genuine timer (not a microtask)
  // keeps the window open long enough for a second HTTP request to also pass the
  // check before this one commits.
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
  if (shortages.length > 0) {
    return { ok: false, shortages };
  }
  for (const line of lines) {
    const requested = Math.max(0, Math.floor(line.quantity));
    reserved.set(line.productId, (reserved.get(line.productId) ?? 0) + requested);
  }
  return { ok: true };
}

/** Resets the ledger to the seed baseline (every product fully available). */
export function resetStock(): void {
  reserved.clear();
}
