import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";
import { getCandidate, mintCandidate } from "@/lib/access/candidates";
import type { CandidateRecord } from "@/lib/access/candidates";

// Phase 3 — the reviewer candidate-access API is a GENUINE access-control
// boundary (not a seeded bug): every method 403s for non-admins. The admin
// guard is mocked (same pattern as the bug-image route test); the candidates
// service runs for real over the in-memory backend.

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

async function collectionRoute() {
  return import("@/app/api/admin/candidates/route");
}

async function itemRoute() {
  return import("@/app/api/admin/candidates/[code]/route");
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(code: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/candidates/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(code: string): { params: Promise<{ code: string }> } {
  return { params: Promise.resolve({ code }) };
}

beforeEach(() => {
  getAdminOrNullMock.mockResolvedValue(admin);
});

describe("access control — every method 403s for non-admins", () => {
  beforeEach(() => {
    getAdminOrNullMock.mockResolvedValue(null);
  });

  it("GET (list) returns 403", async () => {
    const { GET } = await collectionRoute();
    expect((await GET()).status).toBe(403);
  });

  it("POST (mint) returns 403", async () => {
    const { POST } = await collectionRoute();
    expect((await POST(postRequest({ name: "X" }))).status).toBe(403);
  });

  it("DELETE (revoke) returns 403", async () => {
    const { DELETE } = await itemRoute();
    const response = await DELETE(
      new Request("http://localhost/api/admin/candidates/deadbeef", { method: "DELETE" }),
      params("deadbeef"),
    );
    expect(response.status).toBe(403);
  });

  it("PATCH (extend) returns 403", async () => {
    const { PATCH } = await itemRoute();
    const response = await PATCH(patchRequest("deadbeef", { extraDays: 10 }), params("deadbeef"));
    expect(response.status).toBe(403);
  });
});

describe("POST — mint", () => {
  it("mints a candidate and returns 201 with the record", async () => {
    const { POST } = await collectionRoute();

    const response = await POST(postRequest({ name: "Priya Sharma", windowDays: 7 }));

    expect(response.status).toBe(201);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    expect(candidate.code).toMatch(/^[0-9a-f]{8}$/);
    expect(candidate.name).toBe("Priya Sharma");
    expect(await getCandidate(candidate.code)).not.toBeNull();
  });

  it("defaults windowDays to the standard 10-day window when omitted", async () => {
    const { POST } = await collectionRoute();

    const response = await POST(postRequest({ name: "Default Window" }));

    expect(response.status).toBe(201);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    const windowMs = Date.parse(candidate.expiresAt) - Date.parse(candidate.createdAt);
    expect(windowMs).toBe(10 * 86_400_000);
  });

  it.each([
    ["empty name", { name: "", windowDays: 10 }],
    ["blank name", { name: "   ", windowDays: 10 }],
    ["name over 80 chars", { name: "x".repeat(81), windowDays: 10 }],
    ["windowDays below 1", { name: "X", windowDays: 0 }],
    ["windowDays above 60", { name: "X", windowDays: 61 }],
    ["non-integer windowDays", { name: "X", windowDays: 2.5 }],
    ["non-numeric windowDays", { name: "X", windowDays: "ten" }],
  ])("rejects %s with 400", async (_label, body) => {
    const { POST } = await collectionRoute();
    expect((await POST(postRequest(body))).status).toBe(400);
  });
});

describe("GET — list", () => {
  it("lists a minted candidate", async () => {
    const minted = await mintCandidate("Listed Candidate");
    const { GET } = await collectionRoute();

    const response = await GET();

    expect(response.status).toBe(200);
    const { candidates } = (await response.json()) as { candidates: CandidateRecord[] };
    expect(candidates.map((candidate) => candidate.code)).toContain(minted.code);
  });
});

describe("DELETE — revoke", () => {
  it("revokes a live candidate", async () => {
    const minted = await mintCandidate("Revoked Candidate");
    const { DELETE } = await itemRoute();

    const response = await DELETE(
      new Request(`http://localhost/api/admin/candidates/${minted.code}`, { method: "DELETE" }),
      params(minted.code),
    );

    expect(response.status).toBe(200);
    expect(await getCandidate(minted.code)).toBeNull();
  });

  it("returns 404 for a malformed code", async () => {
    const { DELETE } = await itemRoute();
    const response = await DELETE(
      new Request("http://localhost/api/admin/candidates/BAD!!", { method: "DELETE" }),
      params("BAD!!"),
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH — extend", () => {
  it("extends a live candidate's window by extraDays", async () => {
    const minted = await mintCandidate("Extended Candidate", 10);
    const { PATCH } = await itemRoute();

    const response = await PATCH(patchRequest(minted.code, { extraDays: 5 }), params(minted.code));

    expect(response.status).toBe(200);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    expect(Date.parse(candidate.expiresAt) - Date.parse(minted.expiresAt)).toBe(5 * 86_400_000);
  });

  it("returns 404 for an unknown code", async () => {
    const { PATCH } = await itemRoute();
    const response = await PATCH(patchRequest("deadbeef", { extraDays: 5 }), params("deadbeef"));
    expect(response.status).toBe(404);
  });

  it.each([
    ["missing extraDays", {}],
    ["extraDays below 1", { extraDays: 0 }],
    ["extraDays above 60", { extraDays: 61 }],
    ["non-integer extraDays", { extraDays: 1.5 }],
  ])("rejects %s with 400", async (_label, body) => {
    const minted = await mintCandidate("Validation Candidate");
    const { PATCH } = await itemRoute();
    const response = await PATCH(patchRequest(minted.code, body), params(minted.code));
    expect(response.status).toBe(400);
  });
});
