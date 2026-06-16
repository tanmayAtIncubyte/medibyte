import type { Coupon } from "@/data/coupons";
import {
  buildCartLines,
  computeCartTotals,
  roundMoney,
  type CartLine,
  type CartTotals,
} from "@/lib/cart/totals";
import {
  couponDiscount,
  findCoupon,
  rawCouponDiscount,
  validateCoupon,
} from "@/lib/coupons/coupon";
import { findProductById } from "@/lib/data/products";
import { getCart, getCouponCode } from "@/lib/data/session-store";

export type AppliedCoupon = {
  coupon: Coupon;
  discount: number;
};

export type CartView = CartTotals & {
  appliedCoupon: AppliedCoupon | null;
};

/**
 * Seeded-bug switches for the cart view. Each caller (header, cart page, coupon
 * route, place-order) resolves the flags with the current user and passes them
 * in, so this service stays pure of the gating engine and admins stay clean.
 *   - taxFloor (FN_TAX_FLOOR): floor tax instead of rounding (via totals).
 *   - ignoreExpiry (FN_EXPIRED_COUPON_OK): apply an expired coupon (via coupon).
 *   - totalStale (FN_CART_TOTAL_STALE): total reflects only the FIRST line's
 *     quantity (stale-after-qty-change illusion), while subtotal/lines update.
 */
export type CartViewBugs = {
  taxFloor?: boolean;
  ignoreExpiry?: boolean;
  totalStale?: boolean;
  // Batch-2 totals bugs, plumbed through to computeCartTotals.
  taxBeforeDiscount?: boolean; // FN_TAX_BEFORE_DISCOUNT
  couponNegative?: boolean; // FN_COUPON_NEGATIVE
  roundingEdge?: boolean; // FN_TOTAL_ROUNDING_EDGE
};

/**
 * Server-only cart view: reads the in-memory cart for a session, prices it
 * against the product catalog, resolves any applied coupon, and computes the
 * totals breakdown. A stored coupon that is no longer valid for the current
 * cart (e.g. cart now below its minimum) is simply not applied.
 */
export function getCartView(sessionId: string, bugs: CartViewBugs = {}): CartView {
  const items = getCart(sessionId);
  const lines = buildCartLines(items, findProductById);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));

  const applied = resolveAppliedCoupon(
    getCouponCode(sessionId),
    subtotal,
    bugs.ignoreExpiry ?? false,
  );

  // FN_CART_TOTAL_STALE: price the totals against a "stale" snapshot of the
  // lines that caps the first line at quantity 1, so the displayed total does
  // not move when that line's quantity changes (subtotal/lines still update).
  const totalsLines = bugs.totalStale ? staleLines(lines) : lines;

  // FN_COUPON_NEGATIVE: feed the UNCLAMPED raw coupon discount so totals (with
  // its clamp disabled) can go negative. FN_TOTAL_ROUNDING_EDGE: pass the
  // UNROUNDED raw discount so totals can build the taxed base from it. Both fall
  // back to the clean rounded+clamped discount when their flags are off.
  const rawDiscount = applied
    ? rawCouponDiscount(applied.coupon, subtotal)
    : 0;
  const discountForTotals = bugs.couponNegative
    ? rawDiscount
    : applied?.discount ?? 0;

  const totals = computeCartTotals(totalsLines, discountForTotals, {
    taxFloor: bugs.taxFloor,
    taxBeforeDiscount: bugs.taxBeforeDiscount,
    couponNegative: bugs.couponNegative,
    roundingEdge: bugs.roundingEdge,
    rawDiscount,
  });

  return {
    ...totals,
    // Keep the accurate line list / itemCount visible; only the money is stale.
    lines: [...lines],
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
    subtotal,
    appliedCoupon: applied,
  };
}

// Caps the first line at quantity 1 (and reprices it) so totals computed from
// this snapshot ignore quantity edits to that line — the FN_CART_TOTAL_STALE
// illusion of a total that fails to recompute.
function staleLines(lines: readonly CartLine[]): CartLine[] {
  return lines.map((line, index) =>
    index === 0
      ? { ...line, quantity: 1, lineTotal: roundMoney(line.product.price) }
      : { ...line },
  );
}

function resolveAppliedCoupon(
  code: string | null,
  subtotal: number,
  ignoreExpiry: boolean,
): AppliedCoupon | null {
  if (!code) {
    return null;
  }
  const validation = validateCoupon(code, subtotal, new Date(), { ignoreExpiry });
  if (!validation.ok) {
    return null;
  }
  const coupon = findCoupon(code)!;
  return { coupon, discount: couponDiscount(coupon, subtotal) };
}
