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
