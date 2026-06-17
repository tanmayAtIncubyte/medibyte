import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle test for PERF_CART_WATERFALL: the cart page mounts the per-line
// prefetch island with waterfall=true for a customer with the flag on (driving
// the N+1 sequential refetch), and false otherwise. The flag is resolved on the
// cart page (which has the user); admin always gets the clean, no-extra-request
// path. We assert the *branch is selected* via the prop the island receives.

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/data/session-id", () => ({
  readSessionIdFromCookies: () => Promise.resolve("sess-cart"),
}));
vi.mock("@/lib/cart/cart-service", () => ({
  getCartView: () => ({
    lines: [
      {
        product: { id: "prod-1", name: "Ibuprofen 200mg", type: "OTC", price: 6.99 },
        quantity: 2,
        lineTotal: 13.98,
      },
      {
        product: { id: "prod-2", name: "Acetaminophen 500mg", type: "OTC", price: 8.49 },
        quantity: 1,
        lineTotal: 8.49,
      },
    ],
    itemCount: 3,
    subtotal: 22.47,
    tax: 1.8,
    total: 24.27,
    appliedCoupon: null,
  }),
}));

// Capture what props the prefetch island receives without running its effect.
const prefetchProps = vi.fn();
vi.mock("@/components/cart/cart-line-prefetch", () => ({
  CartLinePrefetch: (props: { productIds: string[]; waterfall?: boolean }) => {
    prefetchProps(props);
    return null;
  },
}));

let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import CartPage from "@/app/(storefront)/cart/page";

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

async function renderCart() {
  cleanup();
  render(await CartPage());
}

beforeEach(() => {
  flags = {};
  prefetchProps.mockClear();
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("PERF_CART_WATERFALL toggle", () => {
  it("flag off → island mounts with waterfall=false for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(prefetchProps).toHaveBeenCalledWith(
      expect.objectContaining({ waterfall: false }),
    );
  });

  it("flag on → customer gets waterfall=true; admin stays false", async () => {
    flags = { PERF_CART_WATERFALL: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(prefetchProps).toHaveBeenCalledWith(
      expect.objectContaining({
        waterfall: true,
        productIds: ["prod-1", "prod-2"],
      }),
    );

    prefetchProps.mockClear();
    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(prefetchProps).toHaveBeenCalledWith(
      expect.objectContaining({ waterfall: false }),
    );
  });
});
