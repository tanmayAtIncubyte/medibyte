import { findProductById } from "@/lib/data/products";
import { getCart } from "@/lib/data/session-store";
import {
  buildCartLines,
  computeCartTotals,
  type CartTotals,
} from "@/lib/cart/totals";

/**
 * Server-only cart view: reads the in-memory cart for a session, prices it
 * against the product catalog, and computes the totals breakdown. An optional
 * discount (from an applied coupon) is passed through to the totals math.
 */
export function getCartView(sessionId: string, discount = 0): CartTotals {
  const items = getCart(sessionId);
  const lines = buildCartLines(items, findProductById);
  return computeCartTotals(lines, discount);
}
