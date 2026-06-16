import { globalSingleton } from "@/lib/data/global-store";
import type { Order } from "@/lib/orders/types";

// In-memory per-process order store for orders created at checkout. Anchored on
// globalThis (globalSingleton) so the same store is shared across Next's separate
// API-route and server-component bundles — otherwise a checkout written via the
// /api/checkout route would be invisible to the /orders page render. Writes
// survive for the running server process and are wiped on restart, returning
// every customer to the seed-only baseline. No DB. Orders carry their own userId
// so they are stored globally and filtered by owner on read (ownership enforced
// in lib/orders).

const createdOrders = globalSingleton(
  "orders-store/createdOrders",
  () => [] as Order[],
);

// Per-user monotonic sequence used to derive stable, readable order ids without
// RNG. Resets with the store on restart.
const userSequences = globalSingleton(
  "orders-store/userSequences",
  () => new Map<string, number>(),
);

/** Next 1-based sequence number for a user's session-created orders. */
export function nextOrderSequence(userId: string): number {
  const next = (userSequences.get(userId) ?? 0) + 1;
  userSequences.set(userId, next);
  return next;
}

/** Appends a created order to the store. */
export function appendOrder(order: Order): void {
  createdOrders.push(order);
}

/** All session-created orders (unfiltered). */
export function allCreatedOrders(): Order[] {
  return createdOrders.map((order) => ({ ...order }));
}

export function resetCreatedOrders(): void {
  createdOrders.length = 0;
  userSequences.clear();
}
