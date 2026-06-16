import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { getCartView } from "@/lib/cart/cart-service";
import {
  addToCart,
  resetAllSessions,
  setCouponCode,
} from "@/lib/data/session-store";

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

// FN_COUPON_NEGATIVE end-to-end through getCartView, made observable by the
// MEGA50 seed coupon ($50 off, no minimum). One $6.99 ibuprofen is a ~$7 cart,
// so MEGA50's $50 face value exceeds the subtotal. Clean: discount clamps to the
// $6.99 subtotal so the total floors at $0. Buggy: the missing clamp leaves a
// $50 discount, pushing the total well below zero.
describe("FN_COUPON_NEGATIVE — MEGA50 on a small cart goes negative (MED-9)", () => {
  const SID_CN = "sess-coupon-negative";
  const CN_ON: BugFlags = { FN_COUPON_NEGATIVE: true };
  const CN_OFF: BugFlags = { FN_COUPON_NEGATIVE: false };

  beforeEach(() => {
    resetAllSessions();
    addToCart(SID_CN, "prod-ibuprofen-200", 1); // $6.99 subtotal
    setCouponCode(SID_CN, "MEGA50");
  });

  afterEach(() => resetAllSessions());

  function viewFor(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
    return getCartView(SID_CN, {
      couponNegative: isBugActiveWith(flags, "FN_COUPON_NEGATIVE", user),
    });
  }

  it("flag off → discount clamps to the subtotal so the total floors at $0", () => {
    for (const view of [viewFor(CN_OFF, CUSTOMER), viewFor(CN_OFF, ADMIN)]) {
      expect(view.subtotal).toBe(6.99);
      expect(view.discount).toBe(6.99);
      expect(view.total).toBe(0);
    }
  });

  it("flag on → unclamped MEGA50 discount drives the total negative for a customer, clean for admin", () => {
    const buggy = viewFor(CN_ON, CUSTOMER);
    expect(buggy.subtotal).toBe(6.99);
    expect(buggy.discount).toBe(50); // full face value, not clamped to $6.99
    expect(buggy.total).toBeLessThan(0);

    // Admin always sees the clean clamped total.
    expect(viewFor(CN_ON, ADMIN).total).toBe(0);
  });
});
