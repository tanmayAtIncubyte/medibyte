import { afterEach, describe, expect, it } from "vitest";

import { addToCart, getCart, resetAllSessions } from "@/lib/data/session-store";

// Slice 2 — in-memory per-session write store.
// AC 6: a write performed in a session is readable back within the same session.
// AC 7 (unit proxy): resetAllSessions() returns every session to the seed
// baseline (empty cart), modelling the process-restart reset behaviour.
afterEach(() => {
  resetAllSessions();
});

describe("session cart store", () => {
  it("returns an empty cart for a session with no writes (seed baseline)", () => {
    expect(getCart("session-fresh")).toEqual([]);
  });

  // AC 6
  it("reads back an item written in the same session", () => {
    addToCart("session-a", "prod-ibuprofen-200", 2);

    expect(getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 2 },
    ]);
  });

  it("accumulates quantity when the same product is added again", () => {
    addToCart("session-a", "prod-ibuprofen-200", 2);
    addToCart("session-a", "prod-ibuprofen-200", 3);

    expect(getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 5 },
    ]);
  });

  it("keeps distinct products as separate line items", () => {
    addToCart("session-a", "prod-ibuprofen-200", 1);
    addToCart("session-a", "prod-vitamin-d3", 1);

    expect(getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 1 },
      { productId: "prod-vitamin-d3", quantity: 1 },
    ]);
  });

  // Isolation: one session's writes must not bleed into another.
  it("isolates writes between different session ids", () => {
    addToCart("session-a", "prod-ibuprofen-200", 2);

    expect(getCart("session-b")).toEqual([]);
  });

  it("returns a cart copy so mutating the result does not corrupt stored state", () => {
    addToCart("session-a", "prod-ibuprofen-200", 1);

    const cart = getCart("session-a");
    cart[0].quantity = 999;
    cart.push({ productId: "injected", quantity: 1 });

    expect(getCart("session-a")).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 1 },
    ]);
  });

  // AC 7 (unit-level proxy for process-restart reset).
  it("clears all session state on resetAllSessions", () => {
    addToCart("session-a", "prod-ibuprofen-200", 2);
    addToCart("session-b", "prod-vitamin-d3", 1);

    resetAllSessions();

    expect(getCart("session-a")).toEqual([]);
    expect(getCart("session-b")).toEqual([]);
  });
});
