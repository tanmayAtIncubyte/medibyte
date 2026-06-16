import { describe, expect, it } from "vitest";

import type { CartView } from "@/lib/cart/cart-service";
import type { Product } from "@/data/products";
import {
  createOrder,
  deriveOrderId,
  findOrderForViewer,
  ordersForUser,
  sortOrdersNewestFirst,
} from "@/lib/orders/order";
import type { Order, ShippingAddress } from "@/lib/orders/types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-ibuprofen-200",
    name: "Ibuprofen 200mg Tablets (50 ct)",
    description: "Pain reliever",
    price: 6.99,
    type: "OTC",
    category: "Pain Relief",
    stock: 100,
    requiresPrescription: false,
    ...overrides,
  };
}

const shipping: ShippingAddress = {
  fullName: "Dana Customer",
  street: "412 Birch Lane",
  city: "Portland",
  region: "OR",
  postalCode: "97201",
  country: "USA",
};

function cartView(overrides: Partial<CartView> = {}): CartView {
  const p = product();
  return {
    lines: [{ product: p, quantity: 2, lineTotal: 13.98 }],
    itemCount: 2,
    subtotal: 13.98,
    discount: 0,
    tax: 1.12,
    total: 15.1,
    appliedCoupon: null,
    ...overrides,
  };
}

describe("deriveOrderId", () => {
  it("derives a stable readable id from the clock + sequence (no RNG)", () => {
    const id = deriveOrderId(new Date("2026-06-16T10:00:00.000Z"), 7);
    expect(id).toBe("MB-20260616-0007");
  });

  it("is reproducible for the same input", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    expect(deriveOrderId(at, 1)).toBe(deriveOrderId(at, 1));
  });
});

describe("createOrder", () => {
  it("snapshots cart totals so they match the cart at time of purchase", () => {
    const cart = cartView({ subtotal: 40.99, discount: 4.1, tax: 2.95, total: 39.84 });
    const order = createOrder({
      userId: "user-customer-dana",
      cart,
      shipping,
      prescriptions: [],
      placedAt: new Date("2026-06-16T10:00:00.000Z"),
      sequence: 1,
    });

    expect(order.totals).toEqual({
      subtotal: 40.99,
      discount: 4.1,
      tax: 2.95,
      total: 39.84,
      couponCode: null,
    });
  });

  it("records the applied coupon code in the totals snapshot", () => {
    const cart = cartView({
      appliedCoupon: {
        coupon: {
          code: "SAVE10",
          description: "10% off",
          type: "percent",
          value: 10,
          expiresOn: "2099-12-31",
          minSubtotal: 0,
        },
        discount: 1.4,
      },
    });
    const order = createOrder({
      userId: "u1",
      cart,
      shipping,
      prescriptions: [],
      placedAt: new Date("2026-06-16T10:00:00.000Z"),
      sequence: 1,
    });
    expect(order.totals.couponCode).toBe("SAVE10");
  });

  it("snapshots each line as a frozen item with unit price + line total", () => {
    const order = createOrder({
      userId: "u1",
      cart: cartView(),
      shipping,
      prescriptions: [],
      placedAt: new Date("2026-06-16T10:00:00.000Z"),
      sequence: 3,
    });
    expect(order.items).toEqual([
      {
        productId: "prod-ibuprofen-200",
        name: "Ibuprofen 200mg Tablets (50 ct)",
        type: "OTC",
        unitPrice: 6.99,
        quantity: 2,
        lineTotal: 13.98,
      },
    ]);
  });

  it("starts new orders in the processing status", () => {
    const order = createOrder({
      userId: "u1",
      cart: cartView(),
      shipping,
      prescriptions: [],
      placedAt: new Date("2026-06-16T10:00:00.000Z"),
      sequence: 1,
    });
    expect(order.status).toBe("processing");
  });

  it("attaches captured prescriptions to the order (copied, not referenced)", () => {
    const rx = {
      productId: "prod-lisinopril-10",
      productName: "Lisinopril 10mg Tablets (30 ct)",
      patientName: "Dana",
      dateOfBirth: "1984-06-30",
      prescribingDoctor: "Dr. Marsh",
      prescriptionNumber: "RX-1",
      notes: "daily",
    };
    const order = createOrder({
      userId: "u1",
      cart: cartView(),
      shipping,
      prescriptions: [rx],
      placedAt: new Date("2026-06-16T10:00:00.000Z"),
      sequence: 1,
    });
    expect(order.prescriptions).toEqual([rx]);
    expect(order.prescriptions[0]).not.toBe(rx);
  });
});

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "MB-1",
    userId: "user-customer-dana",
    placedAt: "2026-01-01T00:00:00.000Z",
    status: "processing",
    items: [],
    totals: { subtotal: 0, discount: 0, tax: 0, total: 0, couponCode: null },
    shipping,
    prescriptions: [],
    ...overrides,
  };
}

describe("sortOrdersNewestFirst", () => {
  it("orders by placedAt descending", () => {
    const a = order({ id: "a", placedAt: "2026-01-01T00:00:00.000Z" });
    const b = order({ id: "b", placedAt: "2026-03-01T00:00:00.000Z" });
    const c = order({ id: "c", placedAt: "2026-02-01T00:00:00.000Z" });
    expect(sortOrdersNewestFirst([a, b, c]).map((o) => o.id)).toEqual(["b", "c", "a"]);
  });
});

describe("findOrderForViewer — ownership (clean baseline)", () => {
  const dana = { id: "user-customer-dana", role: "customer" as const };
  const omar = { id: "user-customer-omar", role: "customer" as const };
  const admin = { id: "user-admin", role: "admin" as const };
  const danaOrder = order({ id: "d1", userId: "user-customer-dana" });
  const omarOrder = order({ id: "o1", userId: "user-customer-omar" });
  const orders = [danaOrder, omarOrder];

  it("returns a customer's own order", () => {
    expect(findOrderForViewer(orders, "d1", dana)).toBe(danaOrder);
  });

  it("DENIES access to another customer's order (no IDOR)", () => {
    expect(findOrderForViewer(orders, "o1", dana)).toBeNull();
    expect(findOrderForViewer(orders, "d1", omar)).toBeNull();
  });

  it("returns null for an unknown order id", () => {
    expect(findOrderForViewer(orders, "does-not-exist", dana)).toBeNull();
  });

  it("lets an admin view any order without breaking the customer rule", () => {
    expect(findOrderForViewer(orders, "d1", admin)).toBe(danaOrder);
    expect(findOrderForViewer(orders, "o1", admin)).toBe(omarOrder);
  });
});

describe("ordersForUser", () => {
  it("returns only the user's orders, newest first", () => {
    const orders = [
      order({ id: "d1", userId: "user-customer-dana", placedAt: "2026-01-01T00:00:00.000Z" }),
      order({ id: "o1", userId: "user-customer-omar", placedAt: "2026-02-01T00:00:00.000Z" }),
      order({ id: "d2", userId: "user-customer-dana", placedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(ordersForUser(orders, "user-customer-dana").map((o) => o.id)).toEqual(["d2", "d1"]);
  });
});
