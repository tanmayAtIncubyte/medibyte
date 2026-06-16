import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// requireUser is the Node-runtime gate; drive it directly so we can assert the
// storefront layout enforces it (redirect when logged out, render otherwise).
const requireUserMock = vi.fn<() => Promise<SessionUser>>();
vi.mock("@/lib/auth/guards", () => ({
  requireUser: () => requireUserMock(),
}));

import StorefrontLayout from "@/app/(storefront)/layout";

const admin: SessionUser = {
  id: "user-admin",
  name: "MediByte Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

const customer: SessionUser = {
  id: "user-customer-dana",
  name: "Dana Customer",
  email: "dana@example.test",
  role: "customer",
};

afterEach(() => {
  vi.clearAllMocks();
});

// MED-17 — the authenticated route group gates the whole storefront (home,
// products, product detail, cart) in one place.
describe("StorefrontLayout gate", () => {
  it("renders children for an authenticated customer", async () => {
    requireUserMock.mockResolvedValue(customer);

    const ui = await StorefrontLayout({
      children: <p>protected storefront</p>,
    });
    render(ui);

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("protected storefront")).toBeInTheDocument();
  });

  it("renders children for an authenticated admin", async () => {
    requireUserMock.mockResolvedValue(admin);

    const ui = await StorefrontLayout({
      children: <p>protected storefront</p>,
    });
    render(ui);

    expect(screen.getByText("protected storefront")).toBeInTheDocument();
  });

  it("propagates the redirect when the gate rejects (logged out)", async () => {
    // requireUser() calls redirect('/login'), which throws to halt rendering.
    requireUserMock.mockRejectedValue(new Error("REDIRECT:/login"));

    await expect(
      StorefrontLayout({ children: <p>protected storefront</p> }),
    ).rejects.toThrow("REDIRECT:/login");
  });
});
