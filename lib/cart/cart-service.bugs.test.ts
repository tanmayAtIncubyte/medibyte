import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { getCartView } from "@/lib/cart/cart-service";
import { addToCart, resetAllSessions } from "@/lib/data/session-store";

// Toggle test for FN_CART_TOTAL_STALE. getCartView is pure of the gating engine
// (it takes a CartViewBugs of booleans); we resolve `totalStale` through
// isBugActiveWith. Ibuprofen is $6.99 each.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;
const SID = "sess-cart-total-stale";

const ON: BugFlags = { FN_CART_TOTAL_STALE: true };
const OFF: BugFlags = { FN_CART_TOTAL_STALE: false };

beforeEach(() => {
  resetAllSessions();
  // 3 units of a $6.99 item → correct subtotal 20.97, tax 1.68, total 22.65.
  addToCart(SID, "prod-ibuprofen-200", 3);
});

afterEach(() => resetAllSessions());

function totalFor(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  return getCartView(SID, {
    totalStale: isBugActiveWith(flags, "FN_CART_TOTAL_STALE", user),
  });
}

describe("FN_CART_TOTAL_STALE toggle", () => {
  it("flag off → total reflects the full quantity for everyone", () => {
    for (const view of [totalFor(OFF, CUSTOMER), totalFor(OFF, ADMIN)]) {
      expect(view.subtotal).toBe(20.97);
      expect(view.total).toBe(22.65);
    }
  });

  it("flag on → total ignores the quantity change for a customer, correct for an admin", () => {
    const buggy = totalFor(ON, CUSTOMER);
    // Lines / subtotal still reflect the real quantity...
    expect(buggy.itemCount).toBe(3);
    expect(buggy.subtotal).toBe(20.97);
    // ...but the total is computed as if the first line were quantity 1 (stale).
    expect(buggy.total).toBe(7.55); // 6.99 + 8% tax
    expect(buggy.total).not.toBe(22.65);

    const clean = totalFor(ON, ADMIN);
    expect(clean.total).toBe(22.65);
  });
});
