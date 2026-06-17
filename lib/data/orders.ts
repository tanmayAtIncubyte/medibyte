import { seedOrders } from "@/data/orders";
import { allCreatedOrders } from "@/lib/data/orders-store";
import {
  findOrderForViewer,
  ordersForUser,
  sortOrdersNewestFirst,
  type FindOrderBugs,
} from "@/lib/orders/order";
import type { Order } from "@/lib/orders/types";

// Server-only order accessors. Merge the deterministic seed orders with the
// session-created orders, then apply the pure ownership/lookup logic. Pages
// call these directly (hybrid policy: plain reads are server-rendered).

/** Every known order (seed + session-created), newest first. Admin-facing. */
export function listAllOrders(): Order[] {
  return sortOrdersNewestFirst([...seedOrders, ...allCreatedOrders()]);
}

/** A customer's orders (seed + session-created), newest first. */
export function listOrdersForUser(userId: string): Order[] {
  return ordersForUser([...seedOrders, ...allCreatedOrders()], userId);
}

/**
 * Resolves a single order for a viewer with ownership enforced (clean default).
 * Customers see only their own orders; admins may see any. Unknown/forbidden ->
 * null. SEC_IDOR_ORDER: when `bugs.dropOwnershipCheck` is set (resolved at the
 * page boundary, never for admins), the ownership check is bypassed.
 */
export function getOrderForViewer(
  orderId: string,
  viewer: { id: string; role: "admin" | "customer" },
  bugs: FindOrderBugs = {},
): Order | null {
  return findOrderForViewer([...seedOrders, ...allCreatedOrders()], orderId, viewer, bugs);
}
