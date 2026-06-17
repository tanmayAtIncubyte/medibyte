import { describe, expect, it } from "vitest";

import { isBugActiveWith } from "@/lib/bugs";
import type { BugFlags } from "@/lib/bug-flags";
import { formatPrice, stockLabel } from "@/lib/format";

// Toggle tests for the format-helper bugs. They prove the gating contract end to
// end at the boundary: flag off → correct for everyone; flag on → buggy for a
// customer, still correct for an admin. The helpers themselves are pure (they
// take a boolean), so we drive them through isBugActiveWith with explicit flags.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;
const ON: BugFlags = { FN_PRICE_DECIMALS: true, FN_INSTOCK_AT_ZERO: true };
const OFF: BugFlags = { FN_PRICE_DECIMALS: false, FN_INSTOCK_AT_ZERO: false };

describe("FN_PRICE_DECIMALS toggle", () => {
  it("flag off → two-decimal money for everyone", () => {
    for (const user of [CUSTOMER, ADMIN, null]) {
      const drop = isBugActiveWith(OFF, "FN_PRICE_DECIMALS", user);
      expect(formatPrice(12.49, { dropDecimal: drop })).toBe("$12.49");
    }
  });

  it("flag on → one-decimal for a customer, two-decimal for an admin", () => {
    expect(
      formatPrice(12.49, {
        dropDecimal: isBugActiveWith(ON, "FN_PRICE_DECIMALS", CUSTOMER),
      }),
    ).toBe("$12.5");
    expect(
      formatPrice(12.49, {
        dropDecimal: isBugActiveWith(ON, "FN_PRICE_DECIMALS", ADMIN),
      }),
    ).toBe("$12.49");
  });
});

describe("FN_INSTOCK_AT_ZERO toggle", () => {
  it("flag off → 'Out of stock' at zero for everyone", () => {
    for (const user of [CUSTOMER, ADMIN, null]) {
      const buggy = isBugActiveWith(OFF, "FN_INSTOCK_AT_ZERO", user);
      expect(stockLabel(0, { inStockAtZero: buggy })).toBe("Out of stock");
    }
  });

  it("flag on → 'In stock' at zero for a customer, 'Out of stock' for an admin", () => {
    expect(
      stockLabel(0, {
        inStockAtZero: isBugActiveWith(ON, "FN_INSTOCK_AT_ZERO", CUSTOMER),
      }),
    ).toBe("In stock");
    expect(
      stockLabel(0, {
        inStockAtZero: isBugActiveWith(ON, "FN_INSTOCK_AT_ZERO", ADMIN),
      }),
    ).toBe("Out of stock");
  });
});
