export type CouponType = "percent" | "fixed";

export type Coupon = {
  code: string; // canonical uppercase code
  description: string;
  type: CouponType;
  /** percent: 0-100; fixed: dollar amount off */
  value: number;
  /** ISO date (inclusive). The coupon is valid through the end of this day. */
  expiresOn: string;
  /** Minimum cart subtotal (dollars) required to apply. 0 = no minimum. */
  minSubtotal: number;
};

// Deterministic coupon seed. No DB, no runtime RNG. Includes valid (future
// expiry) and expired codes so both accept and reject paths are exercisable.
export const coupons: readonly Coupon[] = [
  {
    code: "SAVE10",
    description: "10% off your order",
    type: "percent",
    value: 10,
    expiresOn: "2099-12-31",
    minSubtotal: 0,
  },
  {
    code: "WELCOME5",
    description: "$5 off orders of $25 or more",
    type: "fixed",
    value: 5,
    expiresOn: "2099-12-31",
    minSubtotal: 25,
  },
  {
    code: "WELLNESS15",
    description: "15% off your order",
    type: "percent",
    value: 15,
    expiresOn: "2099-12-31",
    minSubtotal: 40,
  },
  {
    code: "SPRING2023",
    description: "Expired spring promotion",
    type: "percent",
    value: 20,
    expiresOn: "2023-05-31",
    minSubtotal: 0,
  },
];
