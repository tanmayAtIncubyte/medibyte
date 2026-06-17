import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle tests for the two GET /api/products performance bugs:
//   - PERF_OVERFETCH_PAYLOAD: response is bloated/duplicated far beyond the lean
//     catalog payload (observable as a large response in DevTools Network).
//   - PERF_NO_CACHE: response forces `Cache-Control: no-store` so the browser
//     refetches on every navigation.
// Both flags are resolved at the route boundary from the current user, so admin
// always gets the clean lean+cacheable response (enforced by isBugActiveWith).

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import { GET as listProductsRoute } from "@/app/api/products/route";

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

async function bodyText(): Promise<string> {
  const response = await listProductsRoute();
  return JSON.stringify(await response.json());
}

beforeEach(() => {
  flags = {};
  getCurrentUserMock.mockResolvedValue(customer);
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("PERF_OVERFETCH_PAYLOAD toggle", () => {
  it("flag off → lean payload (no bloat fields) for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    const lean = await bodyText();
    expect(lean).not.toContain("_auditTrail");
    expect(lean).not.toContain("_seoKeywords");
  });

  it("flag on → customer gets a bloated payload, admin stays lean", async () => {
    flags = { PERF_OVERFETCH_PAYLOAD: true };

    getCurrentUserMock.mockResolvedValue(customer);
    const customerBody = await bodyText();
    expect(customerBody).toContain("_auditTrail");
    expect(customerBody).toContain("_seoKeywords");

    getCurrentUserMock.mockResolvedValue(admin);
    const adminBody = await bodyText();
    expect(adminBody).not.toContain("_auditTrail");
  });
});

describe("PERF_NO_CACHE toggle", () => {
  it("flag off → no forced no-store header for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    const response = await listProductsRoute();
    expect(response.headers.get("cache-control") ?? "").not.toContain("no-store");
  });

  it("flag on → customer response forces no-store, admin does not", async () => {
    flags = { PERF_NO_CACHE: true };

    getCurrentUserMock.mockResolvedValue(customer);
    const customerResponse = await listProductsRoute();
    expect(customerResponse.headers.get("cache-control")).toContain("no-store");

    getCurrentUserMock.mockResolvedValue(admin);
    const adminResponse = await listProductsRoute();
    expect(adminResponse.headers.get("cache-control") ?? "").not.toContain("no-store");
  });
});
