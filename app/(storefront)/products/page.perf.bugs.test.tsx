import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/data/products";
import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for PERF_PRODUCTS_TTFB: the products page blocks the server render
// with an injected delay (no loading skeleton) for a customer with the flag on.
// We assert the buggy *branch is taken* — the injected-delay helper is invoked
// for a customer-with-flag and NOT for admin / flag-off — rather than timing the
// wall clock. The flag is resolved on the page (which has the user).

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const product: Product = {
  id: "otc-1",
  name: "Ibuprofen 200mg",
  description: "Pain reliever.",
  price: 6.99,
  type: "OTC",
  category: "Pain Relief",
  stock: 100,
  requiresPrescription: false,
};
vi.mock("@/lib/data/products", () => ({
  listProducts: () => [product],
}));

let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

// Replace the real timer with an instant spy so the test never actually waits.
const simulateDelayMock = vi.fn(async () => {});
vi.mock("@/lib/perf/simulated-latency", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/perf/simulated-latency")>()),
  simulateDelay: (ms: number) => simulateDelayMock(ms),
}));

import ProductsPage from "@/app/(storefront)/products/page";
import { PRODUCTS_TTFB_DELAY_MS } from "@/lib/perf/simulated-latency";

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

async function renderProducts() {
  cleanup();
  render(await ProductsPage({ searchParams: Promise.resolve({}) }));
}

beforeEach(() => {
  flags = {};
  simulateDelayMock.mockClear();
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("PERF_PRODUCTS_TTFB toggle", () => {
  it("flag off → no injected delay for anyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderProducts();
    expect(simulateDelayMock).not.toHaveBeenCalled();
  });

  it("flag on → customer render injects the delay, admin does not", async () => {
    flags = { PERF_PRODUCTS_TTFB: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderProducts();
    expect(simulateDelayMock).toHaveBeenCalledWith(PRODUCTS_TTFB_DELAY_MS);

    simulateDelayMock.mockClear();
    getCurrentUserMock.mockResolvedValue(admin);
    await renderProducts();
    expect(simulateDelayMock).not.toHaveBeenCalled();
  });
});
