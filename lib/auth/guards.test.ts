import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

const getCurrentUserMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

// redirect() throws in Next to halt rendering; emulate that so we can assert it fired.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { getAdminOrNull, requireAdmin } from "@/lib/auth/guards";

// Slice 4 — admin access control (AC 8). Admin areas require an admin session;
// logged-out and customer sessions must be denied. requireAdmin guards pages
// (redirect), getAdminOrNull guards API handlers (returns null → caller 403).

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

describe("requireAdmin (page guard)", () => {
  it("returns the admin user when an admin session is present", async () => {
    getCurrentUserMock.mockResolvedValue(admin);

    await expect(requireAdmin()).resolves.toEqual(admin);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to login when logged out", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects a customer to login (does not let a customer through)", async () => {
    getCurrentUserMock.mockResolvedValue(customer);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});

describe("getAdminOrNull (API guard)", () => {
  it("returns the admin user when an admin session is present", async () => {
    getCurrentUserMock.mockResolvedValue(admin);

    await expect(getAdminOrNull()).resolves.toEqual(admin);
  });

  it("returns null when logged out (caller responds 403)", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(getAdminOrNull()).resolves.toBeNull();
  });

  it("returns null for a customer session (never lets a customer through)", async () => {
    getCurrentUserMock.mockResolvedValue(customer);

    await expect(getAdminOrNull()).resolves.toBeNull();
  });
});
