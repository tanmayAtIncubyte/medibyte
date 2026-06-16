import type { Coupon } from "@/data/coupons";
import {
  buildCartLines,
  computeCartTotals,
  roundMoney,
  type CartTotals,
} from "@/lib/cart/totals";
import { couponDiscount, findCoupon, validateCoupon } from "@/lib/coupons/coupon";
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
 * Server-only cart view: reads the in-memory cart for a session, prices it
 * against the product catalog, resolves any applied coupon, and computes the
 * totals breakdown. A stored coupon that is no longer valid for the current
 * cart (e.g. cart now below its minimum) is simply not applied.
 */
export function getCartView(sessionId: string): CartView {
  const items = getCart(sessionId);
  const lines = buildCartLines(items, findProductById);
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));

  const applied = resolveAppliedCoupon(getCouponCode(sessionId), subtotal);
  const totals = computeCartTotals(lines, applied?.discount ?? 0);

  return { ...totals, appliedCoupon: applied };
}

function resolveAppliedCoupon(
  code: string | null,
  subtotal: number,
): AppliedCoupon | null {
  if (!code) {
    return null;
  }
  const validation = validateCoupon(code, subtotal);
  if (!validation.ok) {
    return null;
  }
  const coupon = findCoupon(code)!;
  return { coupon, discount: couponDiscount(coupon, subtotal) };
}
