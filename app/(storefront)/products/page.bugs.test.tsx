import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for FN_NORESULTS_BLANK: when a search returns nothing, the empty
// state panel is suppressed (blank) for a customer with the flag on. The flag is
// resolved in the page (which has the user); admin always sees the panel.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
// No products → every search yields zero results.
vi.mock("@/lib/data/products", () => ({
  listProducts: () => [],
}));
let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import ProductsPage from "@/app/(storefront)/products/page";

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

const EMPTY_PANEL = /nothing here yet/i;

async function renderProducts() {
  cleanup();
  render(
    await ProductsPage({ searchParams: Promise.resolve({ search: "zzzzz" }) }),
  );
}

beforeEach(() => {
  flags = {};
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("FN_NORESULTS_BLANK toggle", () => {
  it("flag off → empty-state panel shown for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderProducts();
    expect(screen.getByText(EMPTY_PANEL)).toBeInTheDocument();
  });

  it("flag on → panel suppressed for a customer, shown for an admin", async () => {
    flags = { FN_NORESULTS_BLANK: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderProducts();
    expect(screen.queryByText(EMPTY_PANEL)).not.toBeInTheDocument();

    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    await renderProducts();
    expect(screen.getByText(EMPTY_PANEL)).toBeInTheDocument();
  });
});
