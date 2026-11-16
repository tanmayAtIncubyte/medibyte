import { seedOrders } from "@/data/orders";
import type { UserRole } from "@/data/users";
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
export async function listAllOrders(): Promise<Order[]> {
  return sortOrdersNewestFirst([...seedOrders, ...(await allCreatedOrders())]);
}

/** A customer's orders (seed + session-created), newest first. */
export async function listOrdersForUser(userId: string): Promise<Order[]> {
  return ordersForUser([...seedOrders, ...(await allCreatedOrders())], userId);
}

/**
 * Resolves a single order for a viewer with ownership enforced (clean default).
 * Customers see only their own orders; admins may see any. Unknown/forbidden ->
 * null. SEC_IDOR_ORDER: when `bugs.dropOwnershipCheck` is set (resolved at the
 * page boundary, never for admins), the ownership check is bypassed.
 */
export async function getOrderForViewer(
  orderId: string,
  viewer: { id: string; role: UserRole },
  bugs: FindOrderBugs = {},
): Promise<Order | null> {
  return findOrderForViewer(
    [...seedOrders, ...(await allCreatedOrders())],
    orderId,
    viewer,
    bugs,
  );
}
