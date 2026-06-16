import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// MED-29 — the admin bug-image route is an access-control boundary serving
// reviewer-only answer-key screenshots from a NON-public folder. It must:
//   - 403 for any non-admin (logged-out or customer),
//   - 404 for an unknown key or a not-yet-captured PNG (so the panel's
//     "Screenshot pending" placeholder works pre-capture), and
//   - 200 + image/png for an admin when the screenshot exists.
//
// getAdminOrNull and node:fs/promises#readFile are mocked so the route's
// behavior is tested deterministically, independent of which screenshots have
// actually been captured into private/bug-shots/.

const getAdminOrNullMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/guards", () => ({
  getAdminOrNull: () => getAdminOrNullMock(),
}));

const readFileMock = vi.fn();
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
}));

const admin: SessionUser = {
  id: "user-admin",
  name: "MediByte Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

const enoent = Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });

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

describe("admin bug-image route — serving (MED-29)", () => {
  it("returns 200 + image/png for an admin when the screenshot exists", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    readFileMock.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG magic
    const { GET } = await getRoute();

    const response = await GET(request("FN_PRICE_DECIMALS"), params("FN_PRICE_DECIMALS"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 404 for an admin when the screenshot is not captured (ENOENT)", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    readFileMock.mockRejectedValue(enoent);
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
