import { coupons, type Coupon } from "@/data/coupons";
import { roundMoney } from "@/lib/cart/totals";

// Pure coupon validation + discount math. Framework-free and unit-tested.

export type CouponRejectionReason =
  | "unknown"
  | "expired"
  | "below-minimum";

export type CouponValidation =
  | { ok: true; coupon: Coupon }
  | { ok: false; reason: CouponRejectionReason; message: string };

/** Normalizes user input to a canonical coupon code (trim + uppercase). */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Looks up a coupon by code, case-insensitively. */
export function findCoupon(code: string): Coupon | null {
  const normalized = normalizeCode(code);
  return coupons.find((coupon) => coupon.code === normalized) ?? null;
}

/** A coupon is expired once the day after its inclusive expiry has begun. */
export function isExpired(coupon: Coupon, now: Date = new Date()): boolean {
  // Valid through the end of expiresOn (UTC). Compare to the start of the next day.
  const cutoff = new Date(`${coupon.expiresOn}T23:59:59.999Z`).getTime();
  return now.getTime() > cutoff;
}

/**
 * Validates a code against the catalog for a given cart subtotal and clock.
 * Returns a discriminated result with a customer-facing message on rejection.
 */
export type CouponBugs = {
  // FN_EXPIRED_COUPON_OK: skip the expiry check so an expired coupon still
  // applies. The caller (cart-service, which has the user) resolves the flag and
  // passes the boolean in, keeping this validator pure.
  ignoreExpiry?: boolean;
};

export function validateCoupon(
  code: string,
  subtotal: number,
  now: Date = new Date(),
  bugs: CouponBugs = {},
): CouponValidation {
  const coupon = findCoupon(code);
  if (!coupon) {
    return {
      ok: false,
      reason: "unknown",
      message: "That code isn't valid. Check it and try again.",
    };
  }
  if (!bugs.ignoreExpiry && isExpired(coupon, now)) {
    return {
      ok: false,
      reason: "expired",
      message: "This coupon has expired.",
    };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: "below-minimum",
      message: `Spend at least $${coupon.minSubtotal.toFixed(2)} to use this code.`,
    };
  }
  return { ok: true, coupon };
}

/**
 * The dollar discount a coupon yields for a given subtotal. Percentage coupons
 * are a share of the subtotal; fixed coupons are capped at the subtotal. Always
 * non-negative and rounded to cents.
 */
export function couponDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal <= 0) {
    return 0;
  }
  const raw =
    coupon.type === "percent"
      ? subtotal * (coupon.value / 100)
      : coupon.value;
  return roundMoney(Math.min(Math.max(0, raw), subtotal));
}
