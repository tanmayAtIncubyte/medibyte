import { afterEach, describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { addToCart, getCart, resetAllSessions } from "@/lib/data/session-store";
import { allCreatedOrders, resetCreatedOrders } from "@/lib/data/orders-store";
import { getReservedStock, resetStock } from "@/lib/data/stock-store";
import { placeOrder } from "@/lib/orders/place-order";

// Toggle tests for the place-order bugs. placeOrder is gated through plain
// booleans resolved here via isBugActiveWith, so each test exercises the full
// contract: flag off → correct for everyone; flag on → buggy for a customer,
// clean for an admin.

const CUSTOMER = { id: "user-customer-dana", role: "customer" as const };
const ADMIN = { id: "user-admin", role: "admin" as const };
const now = new Date("2026-06-16T10:00:00.000Z");

// prod-decongestant has only 8 in seed stock — a good low ceiling to oversell.
const LOW_STOCK = "prod-decongestant";

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

function flags(set: Partial<Record<string, boolean>>): BugFlags {
  return set as BugFlags;
}

// ---- FN_OVERSELL ----------------------------------------------------------

async function placeWithOversell(
  flagsValue: BugFlags,
  user: { id: string; role: "admin" | "customer" },
  sessionId: string,
) {
  return placeOrder(
    sessionId,
    user,
    { shipping, prescriptions: {} },
    { now, bugs: { oversell: isBugActiveWith(flagsValue, "FN_OVERSELL", user) } },
  );
}

describe("FN_OVERSELL toggle", () => {
  const ON = flags({ FN_OVERSELL: true });
  const OFF = flags({ FN_OVERSELL: false });

  it("flag off → an order exceeding stock is rejected for everyone", async () => {
    addToCart("cust", LOW_STOCK, 20); // > 8 in stock
    const customer = await placeWithOversell(OFF, CUSTOMER, "cust");
    expect(customer.ok).toBe(false);
    if (!customer.ok) expect(customer.reason).toBe("out-of-stock");

    addToCart("adm", LOW_STOCK, 20);
    const admin = await placeWithOversell(OFF, ADMIN, "adm");
    expect(admin.ok).toBe(false);
  });

  it("flag on → a customer can oversell, admin still blocked", async () => {
    addToCart("cust", LOW_STOCK, 20);
    const customer = await placeWithOversell(ON, CUSTOMER, "cust");
    expect(customer.ok).toBe(true); // order placed beyond the 8 in stock
    expect(getReservedStock(LOW_STOCK)).toBe(20);

    addToCart("adm", LOW_STOCK, 20);
    const admin = await placeWithOversell(ON, ADMIN, "adm");
    expect(admin.ok).toBe(false); // admin always sees the clean stock guard
  });
});

// ---- FN_CONCURRENT_DOUBLESPEND -------------------------------------------

async function placeWithDoubleSpend(
  flagsValue: BugFlags,
  user: { id: string; role: "admin" | "customer" },
  sessionId: string,
) {
  return placeOrder(
    sessionId,
    user,
    { shipping, prescriptions: {} },
    {
      now,
      // Tiny race window keeps the unit suite fast while still exercising the
      // real-timer check-then-act window. In production the window defaults to
      // RACE_WINDOW_MS (~300ms) so a rapid HTTP double-submit reproduces it.
      raceWindowMs: 10,
      bugs: {
        concurrentDoubleSpend: isBugActiveWith(
          flagsValue,
          "FN_CONCURRENT_DOUBLESPEND",
          user,
        ),
      },
    },
  );
}

describe("FN_CONCURRENT_DOUBLESPEND toggle", () => {
  const ON = flags({ FN_CONCURRENT_DOUBLESPEND: true });
  const OFF = flags({ FN_CONCURRENT_DOUBLESPEND: false });

  it("flag off → two near-simultaneous orders cannot both exceed stock", async () => {
    // Two separate sessions each want all 8 units. Atomic reservation lets only
    // one succeed even when fired concurrently.
    addToCart("s-a", LOW_STOCK, 8);
    addToCart("s-b", LOW_STOCK, 8);
    const [a, b] = await Promise.all([
      placeWithDoubleSpend(OFF, CUSTOMER, "s-a"),
      placeWithDoubleSpend(OFF, CUSTOMER, "s-b"),
    ]);
    const successes = [a, b].filter((r) => r.ok).length;
    expect(successes).toBe(1); // exactly one wins
    expect(getReservedStock(LOW_STOCK)).toBe(8); // never oversold
  });

  it("flag on → two concurrent customer orders both succeed beyond stock", async () => {
    addToCart("s-a", LOW_STOCK, 8);
    addToCart("s-b", LOW_STOCK, 8);
    const [a, b] = await Promise.all([
      placeWithDoubleSpend(ON, CUSTOMER, "s-a"),
      placeWithDoubleSpend(ON, CUSTOMER, "s-b"),
    ]);
    expect(a.ok && b.ok).toBe(true); // both win the race
    expect(getReservedStock(LOW_STOCK)).toBe(16); // 2 x 8 against only 8 in stock
  });

  it("flag on → admin still gets the atomic (race-free) path", async () => {
    addToCart("s-a", LOW_STOCK, 8);
    addToCart("s-b", LOW_STOCK, 8);
    const [a, b] = await Promise.all([
      placeWithDoubleSpend(ON, ADMIN, "s-a"),
      placeWithDoubleSpend(ON, ADMIN, "s-b"),
    ]);
    expect([a, b].filter((r) => r.ok).length).toBe(1);
    expect(getReservedStock(LOW_STOCK)).toBe(8);
  });
});

// ---- FN_PARTIAL_CHECKOUT --------------------------------------------------

async function placeWithPartialCheckout(
  flagsValue: BugFlags,
  user: { id: string; role: "admin" | "customer" },
  sessionId: string,
) {
  return placeOrder(
    sessionId,
    user,
    { shipping, prescriptions: {} },
    {
      now,
      bugs: {
        partialCheckout: isBugActiveWith(flagsValue, "FN_PARTIAL_CHECKOUT", user),
      },
    },
  );
}

describe("FN_PARTIAL_CHECKOUT toggle", () => {
  const ON = flags({ FN_PARTIAL_CHECKOUT: true });
  const OFF = flags({ FN_PARTIAL_CHECKOUT: false });

  it("flag off → the cart is cleared after a successful order for everyone", async () => {
    addToCart("cust", "prod-ibuprofen-200", 2);
    const customer = await placeWithPartialCheckout(OFF, CUSTOMER, "cust");
    expect(customer.ok).toBe(true);
    expect(getCart("cust")).toEqual([]);

    addToCart("adm", "prod-ibuprofen-200", 2);
    const admin = await placeWithPartialCheckout(OFF, ADMIN, "adm");
    expect(admin.ok).toBe(true);
    expect(getCart("adm")).toEqual([]);
  });

  it("flag on → the order is created but a customer's cart is NOT cleared; admin clean", async () => {
    addToCart("cust", "prod-ibuprofen-200", 2);
    const customer = await placeWithPartialCheckout(ON, CUSTOMER, "cust");
    expect(customer.ok).toBe(true);
    expect(allCreatedOrders()).toHaveLength(1); // order placed
    expect(getCart("cust")).toHaveLength(1); // but cart still full (inconsistent)

    addToCart("adm", "prod-ibuprofen-200", 2);
    const admin = await placeWithPartialCheckout(ON, ADMIN, "adm");
    expect(admin.ok).toBe(true);
    expect(getCart("adm")).toEqual([]); // admin cart cleared (clean)
  });
});

// ---- SEC_PRICE_TAMPER -----------------------------------------------------

async function placeWithPriceTamper(
  flagsValue: BugFlags,
  user: { id: string; role: "admin" | "customer" },
  sessionId: string,
  clientTotal: number,
) {
  return placeOrder(
    sessionId,
    user,
    { shipping, prescriptions: {} },
    {
      now,
      clientTotal,
      bugs: {
        trustClientTotal: isBugActiveWith(flagsValue, "SEC_PRICE_TAMPER", user),
      },
    },
  );
}

describe("SEC_PRICE_TAMPER toggle", () => {
  const ON = flags({ SEC_PRICE_TAMPER: true });
  const OFF = flags({ SEC_PRICE_TAMPER: false });
  // ibuprofen is 6.99; 2 of them => subtotal 13.98 + 8% tax 1.12 => 15.10.
  const SERVER_TOTAL = 15.1;
  const TAMPERED = 0.01;

  it("flag off → the server-recomputed total is used, client total ignored, for everyone", async () => {
    addToCart("cust", "prod-ibuprofen-200", 2);
    const customer = await placeWithPriceTamper(OFF, CUSTOMER, "cust", TAMPERED);
    expect(customer.ok).toBe(true);
    if (customer.ok) expect(customer.order.totals.total).toBeCloseTo(SERVER_TOTAL, 2);

    addToCart("adm", "prod-ibuprofen-200", 2);
    const admin = await placeWithPriceTamper(OFF, ADMIN, "adm", TAMPERED);
    expect(admin.ok).toBe(true);
    if (admin.ok) expect(admin.order.totals.total).toBeCloseTo(SERVER_TOTAL, 2);
  });

  it("flag on → a customer's tampered total is trusted; admin always recomputes", async () => {
    addToCart("cust", "prod-ibuprofen-200", 2);
    const customer = await placeWithPriceTamper(ON, CUSTOMER, "cust", TAMPERED);
    expect(customer.ok).toBe(true);
    if (customer.ok) expect(customer.order.totals.total).toBe(TAMPERED); // underpaid

    addToCart("adm", "prod-ibuprofen-200", 2);
    const admin = await placeWithPriceTamper(ON, ADMIN, "adm", TAMPERED);
    expect(admin.ok).toBe(true);
    if (admin.ok) expect(admin.order.totals.total).toBeCloseTo(SERVER_TOTAL, 2); // clean
  });
});
