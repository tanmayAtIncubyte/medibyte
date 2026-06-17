import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle tests for the three cart-page UI/UX bugs. All flags are resolved inside
// CartPage (which has the user) and passed as plain booleans into the otherwise
// clean cart components; the real isBugActive engine decides, so admin is clean.
//
//  - UI_DESTRUCTIVE_NO_CONFIRM — Remove deletes instantly with no confirm.
//  - UI_MISLEADING_ICON — the destructive Remove button shows a Heart icon.
//  - UX_SURPRISE_TAX — the tax line is hidden on the cart (surfaces at checkout).

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
const fetchMock = vi.fn().mockResolvedValue({ ok: true });
const confirmMock = vi.fn();
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
    ],
    itemCount: 2,
    subtotal: 13.98,
    discount: 0,
    tax: 1.12,
    total: 15.1,
    appliedCoupon: null,
  }),
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
  fetchMock.mockClear().mockResolvedValue({ ok: true });
  confirmMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", confirmMock);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  flags = {};
});

describe("UI_DESTRUCTIVE_NO_CONFIRM toggle (cart remove)", () => {
  it("flag off → Remove asks for confirmation before deleting, for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    confirmMock.mockReturnValue(false); // customer cancels
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled(); // cancelled → no delete
  });

  it("flag on → Remove deletes instantly with no confirm for a customer; admin still confirms", async () => {
    flags = { UI_DESTRUCTIVE_NO_CONFIRM: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(confirmMock).not.toHaveBeenCalled(); // no prompt

    fetchMock.mockClear();
    confirmMock.mockReset().mockReturnValue(false);
    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(confirmMock).toHaveBeenCalled(); // admin still gets the confirm
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("UI_MISLEADING_ICON toggle (cart remove icon)", () => {
  // lucide renders an svg with a class derived from the icon name.
  function removeIcon(): Element | null {
    return screen
      .getByRole("button", { name: /remove/i })
      .querySelector("svg");
  }

  it("flag off → Remove shows the trash icon for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(removeIcon()?.getAttribute("class") ?? "").toContain("lucide-trash");

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(removeIcon()?.getAttribute("class") ?? "").toContain("lucide-trash");
  });

  it("flag on → Remove shows the misleading heart icon for a customer; trash for an admin", async () => {
    flags = { UI_MISLEADING_ICON: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(removeIcon()?.getAttribute("class") ?? "").toContain("lucide-heart");

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(removeIcon()?.getAttribute("class") ?? "").toContain("lucide-trash");
  });
});

describe("UX_SURPRISE_TAX toggle (cart tax line)", () => {
  it("flag off → the tax line is shown on the cart for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(screen.getByText(/Tax \(8%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^Total$/)).toBeInTheDocument();

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(screen.getByText(/Tax \(8%\)/i)).toBeInTheDocument();
  });

  it("flag on → tax hidden on the cart for a customer; shown for an admin", async () => {
    flags = { UX_SURPRISE_TAX: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(screen.queryByText(/Tax \(8%\)/i)).toBeNull();

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(screen.getByText(/Tax \(8%\)/i)).toBeInTheDocument();
  });
});
