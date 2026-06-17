import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/data/products";
import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for FN_TRIPWIRE_COPY (reading tripwire): an extra line of copy
// that contradicts the Rx/OTC badge, shown only to a customer with the flag on.
// The flag is resolved in the page (which has the user); admin must never see it.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const rxProduct: Product = {
  id: "rx-1",
  name: "Amoxicillin 500mg",
  description: "Antibiotic for bacterial infections.",
  price: 18,
  type: "Rx",
  category: "Antibiotics",
  stock: 60,
  requiresPrescription: true,
};
vi.mock("@/lib/data/products", () => ({
  findProductById: () => rxProduct,
}));
let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import ProductDetailPage from "@/app/(storefront)/products/[id]/page";

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

const CONTRADICTION = /no prescription needed/i;

async function renderDetail() {
  cleanup();
  render(await ProductDetailPage({ params: Promise.resolve({ id: "rx-1" }) }));
}

beforeEach(() => {
  flags = {};
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("FN_TRIPWIRE_COPY toggle", () => {
  it("flag off → no contradictory copy for anyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderDetail();
    expect(screen.queryByText(CONTRADICTION)).not.toBeInTheDocument();
  });

  it("flag on → customer sees the contradictory copy, admin does not", async () => {
    flags = { FN_TRIPWIRE_COPY: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderDetail();
    expect(screen.getByText(CONTRADICTION)).toBeInTheDocument();

    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(admin);
    await renderDetail();
    expect(screen.queryByText(CONTRADICTION)).not.toBeInTheDocument();
  });
});
