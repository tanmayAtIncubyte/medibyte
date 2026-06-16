import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { computeCartTotals, type CartLine } from "@/lib/cart/totals";

// Toggle test for FN_TAX_FLOOR. computeCartTotals is pure (takes a taxFloor
// boolean); we resolve it through isBugActiveWith to exercise the full contract.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;

function line(price: number, quantity: number): CartLine {
  const product = {
    id: "p",
    name: "p",
    description: "d",
    price,
    type: "OTC",
    category: "General",
    stock: 50,
    requiresPrescription: false,
  } satisfies Product;
  return { product, quantity, lineTotal: price * quantity };
}

// Subtotal 10.07 → tax 10.07 * 0.08 = 0.8056 → rounds to 0.81, floors to 0.80.
const lines = [line(10.07, 1)];
const ON: BugFlags = { FN_TAX_FLOOR: true };
const OFF: BugFlags = { FN_TAX_FLOOR: false };

function tax(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  return computeCartTotals(lines, 0, {
    taxFloor: isBugActiveWith(flags, "FN_TAX_FLOOR", user),
  }).tax;
}

describe("FN_TAX_FLOOR toggle", () => {
  it("flag off → tax rounded to cents for everyone", () => {
    expect(tax(OFF, CUSTOMER)).toBe(0.81);
    expect(tax(OFF, ADMIN)).toBe(0.81);
  });

  it("flag on → tax floored for a customer, rounded for an admin", () => {
    expect(tax(ON, CUSTOMER)).toBe(0.8);
    expect(tax(ON, ADMIN)).toBe(0.81);
  });
});

// FN_TAX_BEFORE_DISCOUNT: tax on the pre-discount subtotal. Cart subtotal $100,
// $10 discount. Clean tax = 8% of $90 = $7.20; buggy tax = 8% of $100 = $8.00.
const discountedLines = [line(100, 1)];

function totalsTaxBeforeDiscount(
  flags: BugFlags,
  user: { role: "admin" | "customer" } | null,
) {
  return computeCartTotals(discountedLines, 10, {
    taxBeforeDiscount: isBugActiveWith(flags, "FN_TAX_BEFORE_DISCOUNT", user),
  });
}

const TBD_ON: BugFlags = { FN_TAX_BEFORE_DISCOUNT: true };
const TBD_OFF: BugFlags = { FN_TAX_BEFORE_DISCOUNT: false };

describe("FN_TAX_BEFORE_DISCOUNT toggle", () => {
  it("flag off → tax on the discounted base for everyone", () => {
    expect(totalsTaxBeforeDiscount(TBD_OFF, CUSTOMER).tax).toBe(7.2);
    expect(totalsTaxBeforeDiscount(TBD_OFF, ADMIN).tax).toBe(7.2);
    expect(totalsTaxBeforeDiscount(TBD_OFF, CUSTOMER).total).toBe(97.2);
  });

  it("flag on → tax on the pre-discount subtotal for a customer, clean for admin", () => {
    expect(totalsTaxBeforeDiscount(TBD_ON, CUSTOMER).tax).toBe(8);
    expect(totalsTaxBeforeDiscount(TBD_ON, CUSTOMER).total).toBe(98); // 90 base + 8 tax
    expect(totalsTaxBeforeDiscount(TBD_ON, ADMIN).tax).toBe(7.2);
  });
});

// FN_COUPON_NEGATIVE: discount not clamped to subtotal. Cart subtotal $20 with a
// $30 discount. Clean clamps to $20 (total $0); buggy leaves $30 (negative).
const smallCart = [line(20, 1)];

function totalsCouponNegative(
  flags: BugFlags,
  user: { role: "admin" | "customer" } | null,
) {
  return computeCartTotals(smallCart, 30, {
    couponNegative: isBugActiveWith(flags, "FN_COUPON_NEGATIVE", user),
  });
}

const CN_ON: BugFlags = { FN_COUPON_NEGATIVE: true };
const CN_OFF: BugFlags = { FN_COUPON_NEGATIVE: false };

describe("FN_COUPON_NEGATIVE toggle", () => {
  it("flag off → discount clamped to subtotal, total never negative", () => {
    expect(totalsCouponNegative(CN_OFF, CUSTOMER).discount).toBe(20);
    expect(totalsCouponNegative(CN_OFF, CUSTOMER).total).toBe(0);
    expect(totalsCouponNegative(CN_OFF, ADMIN).total).toBe(0);
  });

  it("flag on → unclamped discount makes the total negative for a customer, clean for admin", () => {
    const customer = totalsCouponNegative(CN_ON, CUSTOMER);
    expect(customer.discount).toBe(30);
    expect(customer.total).toBeLessThan(0); // -10 base - 0.80 tax = -10.80
    expect(totalsCouponNegative(CN_ON, ADMIN).total).toBe(0);
  });
});

// FN_TOTAL_ROUNDING_EDGE: rounding-order edge. Subtotal $1.05 with a 10% coupon.
// Clean: discount = round(0.105) = 0.11 → base 0.94 → tax round(0.0752)=0.08 →
// total 1.02. Buggy: base = 1.05 - 0.105 = 0.945 → tax round(0.0756)=0.08 →
// total round(1.025) = 1.03. They differ by a cent ONLY at such values.
const edgeCart = [line(1.05, 1)];

function totalsRoundingEdge(
  flags: BugFlags,
  user: { role: "admin" | "customer" } | null,
) {
  return computeCartTotals(edgeCart, 0.11, {
    roundingEdge: isBugActiveWith(flags, "FN_TOTAL_ROUNDING_EDGE", user),
    rawDiscount: 0.105,
  });
}

const RE_ON: BugFlags = { FN_TOTAL_ROUNDING_EDGE: true };
const RE_OFF: BugFlags = { FN_TOTAL_ROUNDING_EDGE: false };

describe("FN_TOTAL_ROUNDING_EDGE toggle", () => {
  it("flag off → clean rounding-order total for everyone", () => {
    expect(totalsRoundingEdge(RE_OFF, CUSTOMER).total).toBe(1.02);
    expect(totalsRoundingEdge(RE_OFF, ADMIN).total).toBe(1.02);
  });

  it("flag on → off-by-a-cent total for a customer at the edge value, clean for admin", () => {
    expect(totalsRoundingEdge(RE_ON, CUSTOMER).total).toBe(1.03);
    expect(totalsRoundingEdge(RE_ON, ADMIN).total).toBe(1.02);
  });

  it("flag on → correct total at a non-edge value (tax precision unaffected)", () => {
    // Subtotal $100, 10% coupon: discount 10 (round == raw), base 90, tax 7.20,
    // total 97.20 in both orderings — the edge does not fire.
    const nonEdge = computeCartTotals([line(100, 1)], 10, {
      roundingEdge: true,
      rawDiscount: 10,
    });
    expect(nonEdge.total).toBe(97.2);
  });
});
