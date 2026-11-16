import { afterEach, describe, expect, it } from "vitest";

import { appendOrder, resetCreatedOrders } from "@/lib/data/orders-store";
import {
  getOrderForViewer,
  listAllOrders,
  listOrdersForUser,
} from "@/lib/data/orders";
import type { Order } from "@/lib/orders/types";

const dana = { id: "user-customer-dana", role: "customer" as const };
const omar = { id: "user-customer-omar", role: "customer" as const };
const admin = { id: "user-admin", role: "admin" as const };

afterEach(async () => {
  await resetCreatedOrders();
});

function createdOrder(): Order {
  return {
    id: "MB-NEW-1",
    userId: "user-customer-dana",
    placedAt: "2099-01-01T00:00:00.000Z",
    status: "processing",
    items: [],
    totals: { subtotal: 0, discount: 0, tax: 0, total: 0, couponCode: null },
    shipping: {
      fullName: "Dana",
      street: "x",
      city: "x",
      region: "x",
      postalCode: "x",
      country: "USA",
    },
    prescriptions: [],
  };
}

describe("listOrdersForUser (seed + session, newest first)", () => {
  it("returns dana's seed orders newest first", async () => {
    const orders = await listOrdersForUser("user-customer-dana");
    expect(orders.length).toBeGreaterThanOrEqual(2);
    expect(orders[0].id).toBe("MB-20260228-0002"); // Feb after Jan
    expect(orders.every((o) => o.userId === "user-customer-dana")).toBe(true);
  });

  it("does not include another customer's orders", async () => {
    const orders = await listOrdersForUser("user-customer-dana");
    expect(orders.some((o) => o.userId === "user-customer-omar")).toBe(false);
  });

  it("merges a session-created order ahead of seed orders", async () => {
    await appendOrder(createdOrder());
    const orders = await listOrdersForUser("user-customer-dana");
    expect(orders[0].id).toBe("MB-NEW-1");
  });
});

describe("getOrderForViewer — ownership across seed + created", () => {
  it("lets dana view her own seed order", async () => {
    expect((await getOrderForViewer("MB-20260112-0001", dana))?.userId).toBe("user-customer-dana");
  });

  it("denies dana access to omar's seed order (no IDOR)", async () => {
    expect(await getOrderForViewer("MB-20260305-0001", dana)).toBeNull();
  });

  it("denies omar access to dana's seed order", async () => {
    expect(await getOrderForViewer("MB-20260112-0001", omar)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await getOrderForViewer("MB-NOPE", dana)).toBeNull();
  });

  it("lets admin view any order", async () => {
    expect((await getOrderForViewer("MB-20260305-0001", admin))?.userId).toBe("user-customer-omar");
  });
});

describe("listAllOrders (admin-facing)", () => {
  it("includes every seed order", async () => {
    const ids = (await listAllOrders()).map((o) => o.id);
    expect(ids).toContain("MB-20260112-0001");
    expect(ids).toContain("MB-20260305-0001");
  });
});
