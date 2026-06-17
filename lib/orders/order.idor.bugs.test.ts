import { describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { findOrderForViewer } from "@/lib/orders/order";
import type { Order } from "@/lib/orders/types";

// SEC_IDOR_ORDER toggle test (pure ownership logic). The order detail page
// resolves the flag and passes `dropOwnershipCheck` in; here we drive the pure
// resolver via isBugActiveWith so the full contract is covered:
//   flag off → ownership enforced for everyone (foreign id → null),
//   flag on  → a customer can read a foreign order, an admin always can (and is
//              never affected by the flag).

const DANA = { id: "user-customer-dana", role: "customer" as const };
const OMAR = { id: "user-customer-omar", role: "customer" as const };
const ADMIN = { id: "user-admin", role: "admin" as const };

const omarsOrder = {
  id: "MB-OMAR-0001",
  userId: OMAR.id,
  placedAt: "2026-01-10T00:00:00.000Z",
  status: "processing",
  items: [],
  totals: { subtotal: 0, discount: 0, tax: 0, total: 0, couponCode: null },
  shipping: {
    fullName: "Omar Patient",
    street: "1 Elm",
    city: "C",
    region: "R",
    postalCode: "00001",
    country: "USA",
  },
  prescriptions: [
    {
      productId: "rx",
      productName: "Rx",
      patientName: "Omar Patient",
      dateOfBirth: "1990-01-01",
      prescribingDoctor: "Dr. Who",
      prescriptionNumber: "RX-1",
      notes: "",
    },
  ],
} as unknown as Order;

const orders: Order[] = [omarsOrder];

function flags(set: Partial<Record<string, boolean>>): BugFlags {
  return set as BugFlags;
}

function resolve(
  flagsValue: BugFlags,
  viewer: { id: string; role: "admin" | "customer" },
) {
  return findOrderForViewer(orders, omarsOrder.id, viewer, {
    dropOwnershipCheck: isBugActiveWith(flagsValue, "SEC_IDOR_ORDER", viewer),
  });
}

describe("SEC_IDOR_ORDER toggle", () => {
  it("flag off → a customer cannot read another customer's order", () => {
    const off = flags({ SEC_IDOR_ORDER: false });
    expect(resolve(off, DANA)).toBeNull();
    expect(resolve(off, OMAR)).toEqual(omarsOrder); // owner still sees their own
    expect(resolve(off, ADMIN)).toEqual(omarsOrder); // admin always allowed
  });

  it("flag on → a customer reads another customer's order (PHI leak), admin unchanged", () => {
    const on = flags({ SEC_IDOR_ORDER: true });
    const leaked = resolve(on, DANA);
    expect(leaked).toEqual(omarsOrder);
    // The leaked order carries Omar's PHI.
    expect(leaked?.prescriptions[0]?.patientName).toBe("Omar Patient");

    // Admin is never affected (the flag is inert for admins) — still allowed.
    expect(resolve(on, ADMIN)).toEqual(omarsOrder);
  });
});
