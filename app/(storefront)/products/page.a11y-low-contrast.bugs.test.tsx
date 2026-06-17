import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/data/products";
import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for A11Y_LOW_CONTRAST: the catalog price text is rendered in a
// near-background gray (well below WCAG AA 4.5:1) for a customer with the flag
// on. The flag is resolved in the page (which has the user); admin always sees
// the accessible foreground token. Detectable with an axe / contrast audit.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const product: Product = {
  id: "otc-1",
  name: "Ibuprofen 200mg",
  description: "Pain reliever and fever reducer.",
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

// The low-contrast token used by the buggy branch (near-background gray).
const LOW_CONTRAST_CLASS = "text-muted-foreground/40";
const ACCESSIBLE_CLASS = "text-foreground";

async function priceClasses() {
  cleanup();
  render(await ProductsPage({ searchParams: Promise.resolve({}) }));
  return screen.getByText("$6.99").className;
}

beforeEach(() => {
  flags = {};
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("A11Y_LOW_CONTRAST toggle", () => {
  it("flag off → price uses the accessible foreground token for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    let cls = await priceClasses();
    expect(cls).toContain(ACCESSIBLE_CLASS);
    expect(cls).not.toContain(LOW_CONTRAST_CLASS);

    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    cls = await priceClasses();
    expect(cls).toContain(ACCESSIBLE_CLASS);
    expect(cls).not.toContain(LOW_CONTRAST_CLASS);
  });

  it("flag on → low-contrast price for a customer, accessible for an admin", async () => {
    flags = { A11Y_LOW_CONTRAST: true };

    getCurrentUserMock.mockResolvedValue(customer);
    let cls = await priceClasses();
    expect(cls).toContain(LOW_CONTRAST_CLASS);
    expect(cls).not.toContain(ACCESSIBLE_CLASS);

    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    cls = await priceClasses();
    expect(cls).toContain(ACCESSIBLE_CLASS);
    expect(cls).not.toContain(LOW_CONTRAST_CLASS);
  });
});
