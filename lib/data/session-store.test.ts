import { afterEach, describe, expect, it } from "vitest";

import {
  addToCart,
  clearCoupon,
  getCart,
  getCouponCode,
  removeFromCart,
  resetAllSessions,
  setCartItemQuantity,
  setCouponCode,
} from "@/lib/data/session-store";

// Slice 2 — per-session write store over the async KV seam.
// AC 6: a write performed in a session is readable back within the same session.
// AC 7 (unit proxy): resetAllSessions() returns every session to the seed
// baseline (empty cart), modelling the process-restart reset behaviour.
afterEach(async () => {
  await resetAllSessions();
});

describe("session cart store", () => {
  it("returns an empty cart for a session with no writes (seed baseline)", async () => {
    expect(await getCart("session-fresh")).toEqual([]);
  });

  // AC 6
  it("reads back an item written in the same session", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 2 },
    ]);
  });

  it("accumulates quantity when the same product is added again", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);
    await addToCart("session-a", "prod-ibuprofen-200", 3);

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 5 },
    ]);
  });

  it("keeps distinct products as separate line items", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 1);
    await addToCart("session-a", "prod-vitamin-d3", 1);

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 1 },
      { productId: "prod-vitamin-d3", quantity: 1 },
    ]);
  });

  // Isolation: one session's writes must not bleed into another.
  it("isolates writes between different session ids", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);

    expect(await getCart("session-b")).toEqual([]);
  });

  it("returns a cart copy so mutating the result does not corrupt stored state", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 1);

    const cart = await getCart("session-a");
    cart[0].quantity = 999;
    cart.push({ productId: "injected", quantity: 1 });

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 1 },
    ]);
  });

  it("ignores a non-positive add quantity", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 0);
    await addToCart("session-a", "prod-ibuprofen-200", -3);

    expect(await getCart("session-a")).toEqual([]);
  });

  // Slice 3 — quantity edits + removal.
  it("sets an item's quantity outright", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);
    await setCartItemQuantity("session-a", "prod-ibuprofen-200", 5);

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 5 },
    ]);
  });

  it("removes an item when its quantity is set to zero", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);
    await setCartItemQuantity("session-a", "prod-ibuprofen-200", 0);

    expect(await getCart("session-a")).toEqual([]);
  });

  it("removes an item via removeFromCart", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 1);
    await addToCart("session-a", "prod-vitamin-d3", 1);

    await removeFromCart("session-a", "prod-ibuprofen-200");

    expect(await getCart("session-a")).toEqual([
      { productId: "prod-vitamin-d3", quantity: 1 },
    ]);
  });

  // Slice 4 — applied coupon code per session.
  it("starts with no applied coupon", async () => {
    expect(await getCouponCode("session-a")).toBeNull();
  });

  it("stores and reads back an applied coupon code", async () => {
    await setCouponCode("session-a", "SAVE10");
    expect(await getCouponCode("session-a")).toBe("SAVE10");
  });

  it("replaces an applied coupon when a new one is set", async () => {
    await setCouponCode("session-a", "SAVE10");
    await setCouponCode("session-a", "WELCOME5");
    expect(await getCouponCode("session-a")).toBe("WELCOME5");
  });

  it("clears an applied coupon", async () => {
    await setCouponCode("session-a", "SAVE10");
    await clearCoupon("session-a");
    expect(await getCouponCode("session-a")).toBeNull();
  });

  it("isolates coupons between sessions", async () => {
    await setCouponCode("session-a", "SAVE10");
    expect(await getCouponCode("session-b")).toBeNull();
  });

  // AC 7 (unit-level proxy for process-restart reset).
  it("clears all session state on resetAllSessions", async () => {
    await addToCart("session-a", "prod-ibuprofen-200", 2);
    await addToCart("session-b", "prod-vitamin-d3", 1);
    await setCouponCode("session-a", "SAVE10");

    await resetAllSessions();

    expect(await getCart("session-a")).toEqual([]);
    expect(await getCart("session-b")).toEqual([]);
    expect(await getCouponCode("session-a")).toBeNull();
  });
});
