import { afterEach, describe, expect, it } from "vitest";

import { addToCart, getCart, resetAllSessions, setCouponCode } from "@/lib/data/session-store";
import { allCreatedOrders, resetCreatedOrders } from "@/lib/data/orders-store";
import { resetStock } from "@/lib/data/stock-store";
import { placeOrder } from "@/lib/orders/place-order";

const dana = { id: "user-customer-dana", role: "customer" as const };
const now = new Date("2026-06-16T10:00:00.000Z");

const shipping = {
  fullName: "Dana Customer",
  street: "412 Birch Lane",
  city: "Portland",
  region: "OR",
  postalCode: "97201",
  country: "USA",
};

afterEach(() => {
  resetAllSessions();
  resetCreatedOrders();
  resetStock();
});

describe("placeOrder", () => {
  it("blocks checkout on an empty cart", async () => {
    const result = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });
    expect(result).toEqual({ ok: false, reason: "empty-cart" });
  });

  it("rejects an OTC checkout with incomplete shipping", async () => {
    addToCart("s1", "prod-ibuprofen-200", 1);
    const result = await placeOrder(
      "s1",
      dana,
      { shipping: { ...shipping, city: "" }, prescriptions: {} },
      { now },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("validation");
      expect(result.errors).toHaveProperty("shipping.city");
    }
  });

  it("places an OTC order, persists it, and clears the cart", async () => {
    addToCart("s1", "prod-ibuprofen-200", 2);
    const result = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.userId).toBe("user-customer-dana");
      expect(result.order.items[0].productId).toBe("prod-ibuprofen-200");
      // Totals snapshot matches the cart (2 x 6.99 = 13.98 subtotal + 8% tax).
      expect(result.order.totals.subtotal).toBe(13.98);
      expect(result.order.totals.tax).toBe(1.12);
      expect(result.order.totals.total).toBe(15.1);
    }
    expect(getCart("s1")).toEqual([]);
    expect(allCreatedOrders()).toHaveLength(1);
  });

  it("requires PHI for an Rx item and attaches it on success", async () => {
    addToCart("s1", "prod-lisinopril-10", 1);

    const missing = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });
    expect(missing.ok).toBe(false);

    const ok = await placeOrder(
      "s1",
      dana,
      {
        shipping,
        prescriptions: {
          "prod-lisinopril-10": {
            patientName: "Dana Customer",
            dateOfBirth: "1984-06-30",
            prescribingDoctor: "Dr. Marsh",
            prescriptionNumber: "RX-1",
            notes: "daily",
          },
        },
      },
      { now },
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.order.prescriptions).toHaveLength(1);
      expect(ok.order.prescriptions[0].prescriptionNumber).toBe("RX-1");
    }
  });

  it("snapshots an applied coupon discount into the order totals", async () => {
    addToCart("s1", "prod-ibuprofen-200", 5); // 5 x 6.99 = 34.95
    setCouponCode("s1", "SAVE10");
    const result = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.totals.couponCode).toBe("SAVE10");
      expect(result.order.totals.discount).toBeCloseTo(3.5, 2);
    }
  });

  it("assigns per-user sequential order ids", async () => {
    addToCart("s1", "prod-ibuprofen-200", 1);
    const first = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });
    addToCart("s1", "prod-ibuprofen-200", 1);
    const second = await placeOrder("s1", dana, { shipping, prescriptions: {} }, { now });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.order.id).toBe("MB-20260616-0001");
      expect(second.order.id).toBe("MB-20260616-0002");
    }
  });
});
