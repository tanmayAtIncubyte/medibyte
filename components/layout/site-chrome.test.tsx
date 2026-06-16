import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// SiteHeader is now an async server component that reads the session cookie via
// getCurrentUser (AC 9). Mock it so we can drive each auth state, and mock
// next/navigation because the authenticated header renders the client
// LogoutButton (which uses useRouter).
const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { PageContainer } from "@/components/layout/page-container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { brand } from "@/lib/brand";

const customer: SessionUser = {
  id: "user-customer-dana",
  name: "Dana Customer",
  email: "dana@example.test",
  role: "customer",
};

const admin: SessionUser = {
  id: "user-admin",
  name: "MediByte Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

// Async server component: resolve to its element, then render that.
async function renderHeader() {
  render(await SiteHeader());
}

afterEach(() => {
  vi.clearAllMocks();
});

// AC 5 (layout) + AC 9 (header reflects auth state).
describe("SiteHeader", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue(null);
  });

  it("renders a banner region", async () => {
    await renderHeader();

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders MediByte branding linking back to home", async () => {
    await renderHeader();

    const home = screen.getByRole("link", { name: `${brand.name} home` });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders primary navigation", async () => {
    await renderHeader();

    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
  });
});

// AC 9: header reflects auth state.
describe("SiteHeader auth state", () => {
  it("shows a Sign in link when unauthenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await renderHeader();

    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows the customer's name and a Sign out action when logged in as a customer", async () => {
    getCurrentUserMock.mockResolvedValue(customer);

    await renderHeader();

    expect(screen.getByText("Dana Customer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("does not show an Admin link for a customer", async () => {
    getCurrentUserMock.mockResolvedValue(customer);

    await renderHeader();

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows the Admin link plus name and Sign out for an admin", async () => {
    getCurrentUserMock.mockResolvedValue(admin);

    await renderHeader();

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByText("MediByte Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("SiteFooter", () => {
  it("renders a contentinfo region with the brand name", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent(brand.name);
  });
});

describe("PageContainer", () => {
  it("wraps page content in a main landmark", () => {
    render(
      <PageContainer>
        <p>page body</p>
      </PageContainer>,
    );

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent("page body");
  });
});
