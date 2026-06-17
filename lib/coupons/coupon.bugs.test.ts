import { describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { validateCoupon } from "@/lib/coupons/coupon";

// Toggle test for FN_EXPIRED_COUPON_OK. validateCoupon is pure (takes an
// ignoreExpiry boolean); SPRING2023 is a deterministic already-expired seed code.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;
const NOW = new Date("2026-06-16T00:00:00.000Z"); // well after SPRING2023 expiry

const ON: BugFlags = { FN_EXPIRED_COUPON_OK: true };
const OFF: BugFlags = { FN_EXPIRED_COUPON_OK: false };

function validate(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  return validateCoupon("SPRING2023", 100, NOW, {
    ignoreExpiry: isBugActiveWith(flags, "FN_EXPIRED_COUPON_OK", user),
  });
}

describe("FN_EXPIRED_COUPON_OK toggle", () => {
  it("flag off → expired coupon rejected for everyone", () => {
    expect(validate(OFF, CUSTOMER).ok).toBe(false);
    expect(validate(OFF, ADMIN).ok).toBe(false);
  });

  it("flag on → expired coupon accepted for a customer, rejected for an admin", () => {
    expect(validate(ON, CUSTOMER).ok).toBe(true);
    expect(validate(ON, ADMIN).ok).toBe(false);
  });
});
