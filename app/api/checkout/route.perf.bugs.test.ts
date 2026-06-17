import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for PERF_SLOW_CHECKOUT: the /api/checkout POST stalls ~2s before
// responding (no pending feedback) for a customer with the flag on. We assert
// the buggy *branch is taken* — the injected-delay helper is invoked for a
// customer-with-flag and NOT for admin / flag-off — rather than timing the wall
// clock. The flag is resolved at the route boundary from the current user.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/current-user")>()),
  getCurrentUser: () => getCurrentUserMock(),
}));

let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

// Instant spy in place of the real timer so the test never actually waits.
const simulateDelayMock = vi.fn(async () => {});
vi.mock("@/lib/perf/simulated-latency", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/perf/simulated-latency")>()),
  simulateDelay: (ms: number) => simulateDelayMock(ms),
}));

import { POST as checkout } from "@/app/api/checkout/route";
import { addToCart, resetAllSessions } from "@/lib/data/session-store";
import { resetCreatedOrders } from "@/lib/data/orders-store";
import { resetStock } from "@/lib/data/stock-store";
import { SESSION_ID_COOKIE } from "@/lib/data/session-id";
import { SLOW_CHECKOUT_DELAY_MS } from "@/lib/perf/simulated-latency";

const SID = "sess-checkout-perf";

const customer: SessionUser = {
  id: "user-customer-dana",
  name: "Dana",
  email: "dana@example.test",
  role: "customer",
};
const admin: SessionUser = {
  id: "user-admin",
  name: "Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

const shipping = {
  fullName: "Dana Customer",
  street: "412 Birch Lane",
  city: "Portland",
  region: "OR",
  postalCode: "97201",
  country: "USA",
};

function checkoutRequest(): NextRequest {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${SESSION_ID_COOKIE}=${SID}`,
    },
    body: JSON.stringify({ shipping, prescriptions: {} }),
  });
}

beforeEach(() => {
  flags = {};
  simulateDelayMock.mockClear();
  resetAllSessions();
  resetCreatedOrders();
  resetStock();
  // A single in-stock OTC item so checkout proceeds far enough to matter.
  addToCart(SID, "prod-ibuprofen-200", 1);
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
  resetAllSessions();
  resetCreatedOrders();
  resetStock();
});

describe("PERF_SLOW_CHECKOUT toggle", () => {
  it("flag off → no injected delay for anyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await checkout(checkoutRequest());
    expect(simulateDelayMock).not.toHaveBeenCalled();
  });

  it("flag on → customer checkout injects the delay, admin does not", async () => {
    flags = { PERF_SLOW_CHECKOUT: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await checkout(checkoutRequest());
    expect(simulateDelayMock).toHaveBeenCalledWith(SLOW_CHECKOUT_DELAY_MS);

    simulateDelayMock.mockClear();
    getCurrentUserMock.mockResolvedValue(admin);
    await checkout(checkoutRequest());
    expect(simulateDelayMock).not.toHaveBeenCalled();
  });
});
