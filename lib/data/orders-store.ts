import { currentScope, scopeTtlSeconds } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";
import type { Order } from "@/lib/orders/types";

// Order store for orders created at checkout, kept in the async KV seam
// (lib/data/backend.ts) under the current request's scope: the order list at
// `${scope}:orders:list`, per-user id sequences at `${scope}:orders:seq:<userId>`.
// Scoping isolates a candidate's orders from everyone else's and expires them
// with the access window; locally the backend is in-memory (wiped on restart,
// returning every customer to the seed-only baseline), on the deploy it is
// Redis so a checkout written via /api/checkout is visible to the /orders page
// render on a different lambda. No DB. Orders carry their own userId so they
// are stored globally within the scope and filtered by owner on read
// (ownership enforced in lib/orders).

function listKey(scope: string): string {
  return `${scope}:orders:list`;
}

function seqKey(scope: string, userId: string): string {
  return `${scope}:orders:seq:${userId}`;
}

/** Next 1-based sequence number for a user's session-created orders. */
export async function nextOrderSequence(userId: string): Promise<number> {
  const scope = await currentScope();
  const current = (await backend().get<number>(seqKey(scope, userId))) ?? 0;
  const next = current + 1;
  await backend().set(seqKey(scope, userId), next, scopeTtlSeconds(scope));
  return next;
}

/** Appends a created order to the store. */
export async function appendOrder(order: Order): Promise<void> {
  const scope = await currentScope();
  const orders = (await backend().get<Order[]>(listKey(scope))) ?? [];
  orders.push(order);
  await backend().set(listKey(scope), orders, scopeTtlSeconds(scope));
}

/** All session-created orders (unfiltered). */
export async function allCreatedOrders(): Promise<Order[]> {
  const scope = await currentScope();
  const orders = (await backend().get<Order[]>(listKey(scope))) ?? [];
  return orders.map((order) => ({ ...order }));
}

export async function resetCreatedOrders(): Promise<void> {
  const scope = await currentScope();
  await backend().del(listKey(scope));
  const seqKeys = await backend().listKeys(`${scope}:orders:seq:`);
  for (const key of seqKeys) {
    await backend().del(key);
  }
}
