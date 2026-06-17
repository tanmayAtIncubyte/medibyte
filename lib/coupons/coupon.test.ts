import { describe, expect, it } from "vitest";

import {
  couponDiscount,
  findCoupon,
  isExpired,
  normalizeCode,
  validateCoupon,
} from "@/lib/coupons/coupon";

const NOW = new Date("2024-06-01T12:00:00Z");

describe("normalizeCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCode("  save10 ")).toBe("SAVE10");
  });
});

describe("findCoupon", () => {
  it("finds a coupon case-insensitively", () => {
    expect(findCoupon("save10")?.code).toBe("SAVE10");
  });

  it("returns null for an unknown code", () => {
    expect(findCoupon("NOPE")).toBeNull();
  });
});

describe("isExpired", () => {
  it("treats a future-dated coupon as not expired", () => {
    expect(isExpired(findCoupon("SAVE10")!, NOW)).toBe(false);
  });

  it("treats a past-dated coupon as expired", () => {
    expect(isExpired(findCoupon("SPRING2023")!, NOW)).toBe(true);
  });

  it("keeps a coupon valid through the end of its expiry day", () => {
    const coupon = findCoupon("SPRING2023")!; // expires 2023-05-31
    expect(isExpired(coupon, new Date("2023-05-31T23:00:00Z"))).toBe(false);
    expect(isExpired(coupon, new Date("2023-06-01T00:00:01Z"))).toBe(true);
  });
});

describe("validateCoupon", () => {
  it("accepts a valid, non-expired coupon", () => {
    const result = validateCoupon("SAVE10", 50, NOW);
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown code with a clear message", () => {
    const result = validateCoupon("BOGUS", 50, NOW);
    expect(result).toMatchObject({ ok: false, reason: "unknown" });
    if (!result.ok) expect(result.message).toMatch(/isn't valid/i);
  });

  it("rejects an expired code", () => {
    const result = validateCoupon("SPRING2023", 50, NOW);
    expect(result).toMatchObject({ ok: false, reason: "expired" });
    if (!result.ok) expect(result.message).toMatch(/expired/i);
  });

  it("rejects when the subtotal is below the minimum", () => {
    const result = validateCoupon("WELCOME5", 10, NOW);
    expect(result).toMatchObject({ ok: false, reason: "below-minimum" });
  });

  it("accepts once the subtotal meets the minimum", () => {
    expect(validateCoupon("WELCOME5", 25, NOW).ok).toBe(true);
  });
});

describe("couponDiscount", () => {
  it("computes a percentage discount", () => {
    expect(couponDiscount(findCoupon("SAVE10")!, 50)).toBe(5);
  });

  it("computes a fixed discount", () => {
    expect(couponDiscount(findCoupon("WELCOME5")!, 30)).toBe(5);
  });

  it("caps a fixed discount at the subtotal", () => {
    expect(couponDiscount(findCoupon("WELCOME5")!, 3)).toBe(3);
  });

  it("returns zero for an empty cart", () => {
    expect(couponDiscount(findCoupon("SAVE10")!, 0)).toBe(0);
  });

  it("rounds a percentage discount to cents", () => {
    // 15% of 33.33 = 4.9995 -> 5.00
    expect(couponDiscount(findCoupon("WELLNESS15")!, 33.33)).toBe(5);
  });
});
