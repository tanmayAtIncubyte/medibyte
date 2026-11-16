import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";
import { effectiveExpiresAt, getCandidate, mintCandidate } from "@/lib/access/candidates";
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

function deleteRequest(code: string): Request {
  return new Request(`http://localhost/api/admin/candidates/${code}`, { method: "DELETE" });
}

function params(code: string): { params: Promise<{ code: string }> } {
  return { params: Promise.resolve({ code }) };
}

let emailSeq = 0;
function uniqueEmail(): string {
  emailSeq += 1;
  return `cand-${emailSeq}@example.com`;
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
    const response = await DELETE(deleteRequest("deadbeef"), params("deadbeef"));
    expect(response.status).toBe(403);
  });

  it("PATCH (action) returns 403", async () => {
    const { PATCH } = await itemRoute();
    const response = await PATCH(
      patchRequest("deadbeef", { action: "extend", extraDays: 10 }),
      params("deadbeef"),
    );
    expect(response.status).toBe(403);
  });
});

describe("POST — mint", () => {
  it("mints a candidate and returns 201 with the record (name, email, role, notes, fractional window)", async () => {
    const { POST } = await collectionRoute();
    const email = uniqueEmail();

    const response = await POST(
      postRequest({
        name: "Priya Sharma",
        email,
        role: "Senior QA",
        notes: "Referred by Anita",
        windowDays: 0.5,
      }),
    );

    expect(response.status).toBe(201);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    expect(candidate.code).toMatch(/^[0-9a-f]{8}$/);
    expect(candidate.name).toBe("Priya Sharma");
    expect(candidate.email).toBe(email);
    expect(candidate.role).toBe("Senior QA");
    expect(candidate.notes).toBe("Referred by Anita");
    expect(candidate.attempts[0]).toBeDefined();
    expect(candidate.attempts[0].windowDays).toBe(0.5);
    expect(candidate.status).toBe("active");
    expect(await getCandidate(candidate.code)).not.toBeNull();
  });

  it("defaults windowDays to the standard 10-day window when omitted", async () => {
    const { POST } = await collectionRoute();

    const response = await POST(postRequest({ name: "Default Window", email: uniqueEmail() }));

    expect(response.status).toBe(201);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    const attempt = candidate.attempts[0];
    const windowMs = Date.parse(attempt.expiresAt) - Date.parse(attempt.grantedAt);
    expect(windowMs).toBe(10 * 86_400_000);
  });

  it("rejects a duplicate email with 409", async () => {
    const { POST } = await collectionRoute();
    const email = uniqueEmail();

    const first = await POST(postRequest({ name: "First", email }));
    expect(first.status).toBe(201);

    const second = await POST(postRequest({ name: "Second", email }));
    expect(second.status).toBe(409);
  });

  it("accepts a fractional windowDays such as 2.5", async () => {
    const { POST } = await collectionRoute();
    const response = await POST(
      postRequest({ name: "Fractional", email: uniqueEmail(), windowDays: 2.5 }),
    );
    expect(response.status).toBe(201);
  });

  const E = "x@example.com"; // valid email so each case exercises the field under test
  it.each([
    ["empty name", { name: "", email: E, windowDays: 10 }],
    ["blank name", { name: "   ", email: E, windowDays: 10 }],
    ["name over 80 chars", { name: "x".repeat(81), email: E, windowDays: 10 }],
    ["missing email", { name: "X", windowDays: 10 }],
    ["blank email", { name: "X", email: "   ", windowDays: 10 }],
    ["malformed email", { name: "X", email: "not-an-email", windowDays: 10 }],
    ["role over 80 chars", { name: "X", email: E, role: "r".repeat(81) }],
    ["notes over 500 chars", { name: "X", email: E, notes: "n".repeat(501) }],
    ["windowDays at 0", { name: "X", email: E, windowDays: 0 }],
    ["windowDays negative", { name: "X", email: E, windowDays: -1 }],
    ["windowDays above 60", { name: "X", email: E, windowDays: 61 }],
    ["non-numeric windowDays", { name: "X", email: E, windowDays: "ten" }],
  ])("rejects %s with 400", async (_label, body) => {
    const { POST } = await collectionRoute();
    expect((await POST(postRequest(body))).status).toBe(400);
  });
});

describe("GET — list", () => {
  it("lists a minted candidate", async () => {
    const minted = await mintCandidate({ name: "Listed Candidate", email: uniqueEmail() });
    const { GET } = await collectionRoute();

    const response = await GET();

    expect(response.status).toBe(200);
    const { candidates } = (await response.json()) as { candidates: CandidateRecord[] };
    expect(candidates.map((candidate) => candidate.code)).toContain(minted.code);
  });
});

describe("DELETE — revoke (soft)", () => {
  it("revokes a live candidate but keeps the record", async () => {
    const minted = await mintCandidate({ name: "Revoked Candidate", email: uniqueEmail() });
    const { DELETE } = await itemRoute();

    const response = await DELETE(deleteRequest(minted.code), params(minted.code));

    expect(response.status).toBe(200);
    const stored = await getCandidate(minted.code);
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("revoked");
  });

  it("returns 404 for a malformed code", async () => {
    const { DELETE } = await itemRoute();
    const response = await DELETE(deleteRequest("BAD!!"), params("BAD!!"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH — actions", () => {
  it("extend pushes the current attempt's expiry out by extraDays", async () => {
    const minted = await mintCandidate({
      name: "Extended Candidate",
      email: uniqueEmail(),
      windowDays: 10,
    });
    const before = effectiveExpiresAt(minted);
    const { PATCH } = await itemRoute();

    const response = await PATCH(
      patchRequest(minted.code, { action: "extend", extraDays: 5 }),
      params(minted.code),
    );

    expect(response.status).toBe(200);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    expect(Date.parse(effectiveExpiresAt(candidate)) - Date.parse(before)).toBe(5 * 86_400_000);
  });

  it("extend accepts a fractional extraDays", async () => {
    const minted = await mintCandidate({ name: "Frac Extend", email: uniqueEmail() });
    const { PATCH } = await itemRoute();
    const response = await PATCH(
      patchRequest(minted.code, { action: "extend", extraDays: 0.5 }),
      params(minted.code),
    );
    expect(response.status).toBe(200);
  });

  it("regrant opens a new attempt and returns to active", async () => {
    const minted = await mintCandidate({ name: "Regranted", email: uniqueEmail() });
    const { DELETE, PATCH } = await itemRoute();
    await DELETE(deleteRequest(minted.code), params(minted.code));

    const response = await PATCH(
      patchRequest(minted.code, { action: "regrant", windowDays: 3 }),
      params(minted.code),
    );

    expect(response.status).toBe(200);
    const { candidate } = (await response.json()) as { candidate: CandidateRecord };
    expect(candidate.attempts.length).toBe(minted.attempts.length + 1);
    expect(candidate.status).toBe("active");
  });

  it("remove hard-deletes the roster record", async () => {
    const minted = await mintCandidate({ name: "Removed", email: uniqueEmail() });
    const { PATCH } = await itemRoute();

    const response = await PATCH(
      patchRequest(minted.code, { action: "remove" }),
      params(minted.code),
    );

    expect(response.status).toBe(200);
    const { ok } = (await response.json()) as { ok: boolean };
    expect(ok).toBe(true);
    expect(await getCandidate(minted.code)).toBeNull();
  });

  it("returns 400 for an unknown action", async () => {
    const minted = await mintCandidate({ name: "Bad Action", email: uniqueEmail() });
    const { PATCH } = await itemRoute();
    const response = await PATCH(
      patchRequest(minted.code, { action: "explode", extraDays: 5 }),
      params(minted.code),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    const minted = await mintCandidate({ name: "No Action", email: uniqueEmail() });
    const { PATCH } = await itemRoute();
    const response = await PATCH(patchRequest(minted.code, { extraDays: 5 }), params(minted.code));
    expect(response.status).toBe(400);
  });

  it("returns 404 for extend on an unknown code", async () => {
    const { PATCH } = await itemRoute();
    const response = await PATCH(
      patchRequest("deadbeef", { action: "extend", extraDays: 5 }),
      params("deadbeef"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for regrant on an unknown code", async () => {
    const { PATCH } = await itemRoute();
    const response = await PATCH(
      patchRequest("deadbeef", { action: "regrant", windowDays: 5 }),
      params("deadbeef"),
    );
    expect(response.status).toBe(404);
  });

  it.each([
    ["missing extraDays", { action: "extend" }],
    ["extraDays at 0", { action: "extend", extraDays: 0 }],
    ["extraDays above 60", { action: "extend", extraDays: 61 }],
    ["missing windowDays", { action: "regrant" }],
    ["windowDays above 60", { action: "regrant", windowDays: 61 }],
  ])("rejects %s with 400", async (_label, body) => {
    const minted = await mintCandidate({ name: "Validation Candidate", email: uniqueEmail() });
    const { PATCH } = await itemRoute();
    const response = await PATCH(patchRequest(minted.code, body), params(minted.code));
    expect(response.status).toBe(400);
  });
});
