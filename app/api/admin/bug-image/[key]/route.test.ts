import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// MED-29 — the admin bug-image route is an access-control boundary serving
// reviewer-only answer-key screenshots from a NON-public folder. It must:
//   - 403 for any non-admin (logged-out or customer), and
//   - 404 for an admin when the requested PNG hasn't been captured yet
//     (so the panel's "Screenshot pending" placeholder works pre-capture).
//
// getAdminOrNull is mocked (we test the route's behavior, not auth internals).
// No screenshot fixtures exist in the repo, so the admin path naturally 404s,
// which is exactly the pre-capture state we want to assert.

const getAdminOrNullMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/guards", () => ({
  getAdminOrNull: () => getAdminOrNullMock(),
}));

const admin: SessionUser = {
  id: "user-admin",
  name: "MediByte Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

type Route = typeof import("@/app/api/admin/bug-image/[key]/route");

async function getRoute(): Promise<Route> {
  return import("@/app/api/admin/bug-image/[key]/route");
}

function request(key: string, variant = "clean"): Request {
  return new Request(
    `http://localhost/api/admin/bug-image/${key}?variant=${variant}`,
  );
}

function params(key: string): { params: Promise<{ key: string }> } {
  return { params: Promise.resolve({ key }) };
}

describe("admin bug-image route — access control (MED-29)", () => {
  it("returns 403 for a logged-out (non-admin) caller", async () => {
    getAdminOrNullMock.mockResolvedValue(null);
    const { GET } = await getRoute();

    const response = await GET(request("FN_PRICE_DECIMALS"), params("FN_PRICE_DECIMALS"));

    expect(response.status).toBe(403);
  });

  it("returns 403 for a customer caller", async () => {
    getAdminOrNullMock.mockResolvedValue(null); // guard returns null for non-admins
    const { GET } = await getRoute();

    const response = await GET(request("FN_PRICE_DECIMALS"), params("FN_PRICE_DECIMALS"));

    expect(response.status).toBe(403);
  });
});

describe("admin bug-image route — missing image (MED-29)", () => {
  it("returns 404 for an admin when the screenshot has not been captured", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { GET } = await getRoute();

    const response = await GET(request("FN_PRICE_DECIMALS"), params("FN_PRICE_DECIMALS"));

    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown bug key (never reaches the disk)", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { GET } = await getRoute();

    const response = await GET(request("NOT_A_REAL_KEY"), params("NOT_A_REAL_KEY"));

    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid variant", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { GET } = await getRoute();

    const response = await GET(
      request("FN_PRICE_DECIMALS", "sideways"),
      params("FN_PRICE_DECIMALS"),
    );

    expect(response.status).toBe(400);
  });
});
