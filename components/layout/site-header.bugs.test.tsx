import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for FN_CART_BADGE_LINES. The flag is resolved inside SiteHeader
// (which has the user). We mock the user + cart reads and write the real flag so
// the genuine isBugActive decides; admin must always see the correct count.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/data/session-id", () => ({
  readSessionIdFromCookies: () => Promise.resolve("sess-header"),
}));
// Control the flag in-memory (no shared on-disk file → no cross-test race). The
// REAL isBugActiveWith still runs, so admin-clean is enforced by the engine.
let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));
// Cart with 3 total units across 2 distinct lines: correct badge = 3, buggy = 2.
vi.mock("@/lib/cart/cart-service", () => ({
  getCartView: () => ({
    lines: [{ product: { id: "a" } }, { product: { id: "b" } }],
    itemCount: 3,
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  }),
}));

import { SiteHeader } from "@/components/layout/site-header";

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

async function badgeLabel() {
  cleanup();
  render(await SiteHeader());
  return screen.getByRole("link", { name: /cart/i }).getAttribute("aria-label");
}

beforeEach(() => {
  flags = {};
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("FN_CART_BADGE_LINES toggle", () => {
  it("flag off → badge reflects total quantity (3) for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    expect(await badgeLabel()).toBe("Cart, 3 items");
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    expect(await badgeLabel()).toBe("Cart, 3 items");
  });

  it("flag on → badge counts lines (2) for a customer, total (3) for an admin", async () => {
    flags = { FN_CART_BADGE_LINES: true };
    getCurrentUserMock.mockResolvedValue(customer);
    expect(await badgeLabel()).toBe("Cart, 2 items");
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    expect(await badgeLabel()).toBe("Cart, 3 items");
  });
});
