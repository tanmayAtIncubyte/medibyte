import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Toggle tests for the two cart-page accessibility bugs. Both flags are resolved
// inside CartPage (which has the user) and passed as plain booleans into the
// otherwise-clean cart components. The real isBugActive engine decides, so admin
// is always clean.
//
//  - A11Y_INPUT_NO_LABEL  — the coupon code input loses its programmatic label
//    (no <label htmlFor>, no aria-label) → no accessible name (axe: label).
//  - A11Y_NO_KEYBOARD_FOCUS — the +/- quantity steppers render as non-button
//    <span>s: not real buttons, not in the tab order, no focus ring.

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
// A cart with one line so both the coupon form and a quantity stepper render.
vi.mock("@/lib/cart/cart-service", () => ({
  getCartView: () => ({
    lines: [
      {
        product: {
          id: "prod-1",
          name: "Ibuprofen 200mg",
          type: "OTC",
          price: 6.99,
        },
        quantity: 2,
        lineTotal: 13.98,
      },
    ],
    itemCount: 2,
    subtotal: 13.98,
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
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("A11Y_INPUT_NO_LABEL toggle (coupon code input)", () => {
  // The accessible name comes from the associated <label>. A labelled input is
  // reachable via its accessible name; an unlabelled one is not.
  it("flag off → coupon input has an accessible name for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(screen.getByRole("textbox", { name: /coupon code/i })).toBeInTheDocument();

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(screen.getByRole("textbox", { name: /coupon code/i })).toBeInTheDocument();
  });

  it("flag on → coupon input has no accessible name for a customer, named for an admin", async () => {
    flags = { A11Y_INPUT_NO_LABEL: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    // The label is gone → the textbox can't be found by its accessible name,
    // but the input itself still exists.
    expect(screen.queryByRole("textbox", { name: /coupon code/i })).toBeNull();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByText(/coupon code/i)).toBeNull();

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(screen.getByRole("textbox", { name: /coupon code/i })).toBeInTheDocument();
  });
});

describe("A11Y_NO_KEYBOARD_FOCUS toggle (quantity steppers)", () => {
  it("flag off → +/- steppers are real buttons for everyone", async () => {
    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    expect(
      screen.getByRole("button", { name: /increase quantity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decrease quantity/i }),
    ).toBeInTheDocument();

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(
      screen.getByRole("button", { name: /increase quantity/i }),
    ).toBeInTheDocument();
  });

  it("flag on → +/- steppers are non-button spans for a customer, buttons for an admin", async () => {
    flags = { A11Y_NO_KEYBOARD_FOCUS: true };

    getCurrentUserMock.mockResolvedValue(customer);
    await renderCart();
    // No longer real buttons (not keyboard-operable / not in the tab order)...
    expect(screen.queryByRole("button", { name: /increase quantity/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /decrease quantity/i })).toBeNull();
    // ...but the clickable spans still carry the labels and are not focusable.
    const span = screen.getByLabelText(/increase quantity/i);
    expect(span.tagName).toBe("SPAN");
    expect(span).not.toHaveAttribute("tabindex");

    getCurrentUserMock.mockResolvedValue(admin);
    await renderCart();
    expect(
      screen.getByRole("button", { name: /increase quantity/i }),
    ).toBeInTheDocument();
  });
});
