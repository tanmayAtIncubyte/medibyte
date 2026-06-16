import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";

// Slice 5, AC 8 — the admin guard is a security boundary. The GET/POST handlers
// are driven directly with getAdminOrNull mocked for {logged-out, customer,
// admin}. Denied requests (customer / logged-out) must return 403 AND perform no
// write; an admin request must succeed and persist. POST routing is also covered:
// {reset:true} resets, {key,enabled} for a known key writes, unknown key → 400,
// malformed body → 400.
//
// getAdminOrNull is mocked (we test the route, not auth internals). Its contract
// is "return the admin user, or null when access should be denied", so a denied
// caller (customer / logged-out) is modelled by resolving null — that is exactly
// what the real guard does for a non-admin. The flag
// writers run for real against a temp-dir flag file: process.cwd() is stubbed
// before the route module is imported (vi.resetModules in beforeEach) so writes
// land in the temp dir, never the repo's data/bug-flags.json. Each test asserts
// the file state directly to prove "no write on denial".

const admin: SessionUser = {
  id: "user-admin",
  name: "MediByte Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

const PROBE = "PROBE_NOOP";

const getAdminOrNullMock = vi.fn<() => Promise<SessionUser | null>>();
vi.mock("@/lib/auth/guards", () => ({
  getAdminOrNull: () => getAdminOrNullMock(),
}));

let tempRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;
type Route = typeof import("@/app/api/admin/bug-flags/route");

// Import the route fresh after cwd is stubbed, so the flag writers it pulls in
// resolve FLAG_FILE into the temp dir.
async function loadRoute(): Promise<Route> {
  return import("@/app/api/admin/bug-flags/route");
}

function flagFilePath(): string {
  return path.join(tempRoot, "data", "bug-flags.json");
}

function readFlagFile(): Record<string, boolean> {
  return JSON.parse(readFileSync(flagFilePath(), "utf8"));
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/bug-flags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A POST with a deliberately unparseable body, to exercise the bad-body path.
function malformedPostRequest(): Request {
  return new Request("http://localhost/api/admin/bug-flags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ not json",
  });
}

beforeEach(() => {
  vi.resetModules();
  getAdminOrNullMock.mockReset();
  tempRoot = mkdtempSync(path.join(tmpdir(), "medibyte-route-"));
  mkdirSync(path.join(tempRoot, "data"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempRoot);
});

afterEach(() => {
  cwdSpy.mockRestore();
  vi.resetModules();
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("GET /api/admin/bug-flags — guard", () => {
  it("returns 200 with the current flag map for an admin", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { GET } = await loadRoute();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toHaveProperty(PROBE);
  });

  it("returns 403 for a logged-out visitor", async () => {
    getAdminOrNullMock.mockResolvedValue(null);
    const { GET } = await loadRoute();

    expect((await GET()).status).toBe(403);
  });
});

describe("POST /api/admin/bug-flags — guard denies non-admins with no write", () => {
  // The guard returns null for a customer; the route must deny and not write.
  it("returns 403 for a customer and does not create the flag file", async () => {
    getAdminOrNullMock.mockResolvedValue(null);
    const { POST } = await loadRoute();

    const response = await POST(postRequest({ key: PROBE, enabled: true }));

    expect(response.status).toBe(403);
    expect(existsSync(flagFilePath())).toBe(false);
  });

  it("returns 403 for a logged-out visitor and does not create the flag file", async () => {
    getAdminOrNullMock.mockResolvedValue(null);
    const { POST } = await loadRoute();

    const response = await POST(postRequest({ key: PROBE, enabled: true }));

    expect(response.status).toBe(403);
    expect(existsSync(flagFilePath())).toBe(false);
  });

  it("does not let a denied caller reset the flags either", async () => {
    getAdminOrNullMock.mockResolvedValue(null);
    const { POST } = await loadRoute();

    const response = await POST(postRequest({ reset: true }));

    expect(response.status).toBe(403);
    expect(existsSync(flagFilePath())).toBe(false);
  });
});

describe("POST /api/admin/bug-flags — admin actions", () => {
  it("writes a single flag and persists it for a {key,enabled} request", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { POST } = await loadRoute();

    const response = await POST(postRequest({ key: PROBE, enabled: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ [PROBE]: true });
    expect(readFlagFile()[PROBE]).toBe(true);
  });

  it("resets all flags to disabled for a {reset:true} request", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { POST } = await loadRoute();

    await POST(postRequest({ key: PROBE, enabled: true }));
    const response = await POST(postRequest({ reset: true }));

    expect(response.status).toBe(200);
    expect(readFlagFile()[PROBE]).toBe(false);
  });

  it("returns 400 for an unknown bug key and does not write it", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { POST } = await loadRoute();

    const response = await POST(postRequest({ key: "NOT_A_REAL_BUG", enabled: true }));

    expect(response.status).toBe(400);
    // Rejected before any write — the flag file is never even created.
    expect(existsSync(flagFilePath())).toBe(false);
  });

  it("returns 400 for a malformed request body", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { POST } = await loadRoute();

    expect((await POST(malformedPostRequest())).status).toBe(400);
  });

  it("returns 400 when the body has neither reset nor a key/enabled pair", async () => {
    getAdminOrNullMock.mockResolvedValue(admin);
    const { POST } = await loadRoute();

    expect((await POST(postRequest({ foo: "bar" }))).status).toBe(400);
  });
});
