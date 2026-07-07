import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  candidateHasAccess,
  currentAttempt,
  displayStatus,
  effectiveExpiresAt,
  extendCandidate,
  findCandidateByEmail,
  getCandidate,
  listCandidates,
  markStarted,
  mintCandidate,
  regrantCandidate,
  removeCandidate,
  revokeCandidate,
} from "@/lib/access/candidates";
import { backend } from "@/lib/data/backend";

// The persistent candidate roster. The `cand:<code>` record PERSISTS (no TTL);
// access = status "active" AND the current attempt not yet expired. Revoke is
// reversible, re-grant opens a new attempt, remove is the only delete. Fake
// timers drive the computed expiry checks.

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("mintCandidate", () => {
  it("mints an 8-char hex code with attempt 1, active, name + email", async () => {
    const minted = await mintCandidate({ name: "Priya Sharma", email: "priya@example.com" });

    expect(minted.code).toMatch(/^[0-9a-f]{8}$/);
    expect(minted.status).toBe("active");
    expect(minted.email).toBe("priya@example.com");
    expect(minted.attempts).toHaveLength(1);
    expect(minted.attempts[0]).toMatchObject({
      attempt: 1,
      grantedAt: "2026-07-01T12:00:00.000Z",
      windowDays: 10,
      expiresAt: "2026-07-11T12:00:00.000Z",
    });
    expect(minted.attempts[0].startedAt).toBeUndefined();
  });

  it("stores optional role and notes when provided", async () => {
    const minted = await mintCandidate({
      name: "Omar",
      email: "omar@example.com",
      role: "Senior QA",
      notes: "Referred by Anita",
    });

    expect(await getCandidate(minted.code)).toMatchObject({ role: "Senior QA", notes: "Referred by Anita" });
  });

  it("honors a FRACTIONAL window (0.5 day = 12h)", async () => {
    const minted = await mintCandidate({ name: "Half", email: "half@example.com", windowDays: 0.5 });

    expect(currentAttempt(minted).expiresAt).toBe("2026-07-02T00:00:00.000Z");
  });

  it("persists without a TTL — the record survives past expiry (not deleted)", async () => {
    const minted = await mintCandidate({ name: "Timed", email: "timed@example.com", windowDays: 1 });

    vi.advanceTimersByTime(DAY_MS + HOUR_MS); // past the window

    const record = await getCandidate(minted.code);
    expect(record).not.toBeNull(); // still stored
    expect(displayStatus(record!)).toBe("expired");
    expect(await candidateHasAccess(minted.code)).toBe(false);
    // still on the roster (only removeCandidate deletes)
    expect((await listCandidates()).map((r) => r.code)).toContain(minted.code);
  });
});

describe("findCandidateByEmail (dedup guard)", () => {
  it("finds a roster entry by email, case-insensitively", async () => {
    const minted = await mintCandidate({ name: "Dedup", email: "Dedup@Example.com" });

    const found = await findCandidateByEmail("dedup@example.com");
    expect(found?.code).toBe(minted.code);
  });

  it("returns null when no candidate has that email", async () => {
    await mintCandidate({ name: "Someone", email: "someone@example.com" });
    expect(await findCandidateByEmail("nobody@example.com")).toBeNull();
  });
});

describe("displayStatus", () => {
  it("is active for a live candidate, expired past the window, revoked after revoke", async () => {
    const minted = await mintCandidate({ name: "S", email: "s@example.com", windowDays: 1 });
    expect(displayStatus((await getCandidate(minted.code))!)).toBe("active");

    vi.advanceTimersByTime(2 * DAY_MS);
    expect(displayStatus((await getCandidate(minted.code))!)).toBe("expired");
  });
});

describe("revokeCandidate", () => {
  it("flips status to revoked, stamps the current attempt's revokedAt, and KEEPS the record", async () => {
    const minted = await mintCandidate({ name: "Rev", email: "rev@example.com" });

    const revoked = await revokeCandidate(minted.code);

    expect(revoked?.status).toBe("revoked");
    expect(currentAttempt(revoked!).revokedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(await getCandidate(minted.code)).not.toBeNull(); // still there
    expect(await candidateHasAccess(minted.code)).toBe(false);
    expect((await listCandidates()).map((r) => r.code)).toContain(minted.code);
  });
});

describe("regrantCandidate", () => {
  it("opens attempt 2, sets active, retains the prior (revoked) attempt", async () => {
    const minted = await mintCandidate({ name: "Back", email: "back@example.com", windowDays: 1 });
    await revokeCandidate(minted.code);

    vi.advanceTimersByTime(3 * DAY_MS); // months-later style return
    const regranted = await regrantCandidate(minted.code, 2);

    expect(regranted?.status).toBe("active");
    expect(regranted?.attempts).toHaveLength(2);
    expect(regranted?.attempts[0].revokedAt).toBeTruthy(); // history preserved
    expect(currentAttempt(regranted!)).toMatchObject({ attempt: 2, windowDays: 2 });
    expect(await candidateHasAccess(minted.code)).toBe(true);
  });

  it("does NOT touch the candidate's state keys (resume their work)", async () => {
    const minted = await mintCandidate({ name: "Resume", email: "resume@example.com" });
    await backend().set(`cand:${minted.code}:sess:x`, { cart: [{ productId: "p", quantity: 2 }] });
    await revokeCandidate(minted.code);

    await regrantCandidate(minted.code, 5);

    expect(await backend().get(`cand:${minted.code}:sess:x`)).toEqual({
      cart: [{ productId: "p", quantity: 2 }],
    });
  });
});

describe("extendCandidate", () => {
  it("pushes the current attempt's expiry out by fractional extraDays", async () => {
    const minted = await mintCandidate({ name: "Ext", email: "ext@example.com", windowDays: 1 });

    const extended = await extendCandidate(minted.code, 0.5);

    // current expiry (07-02 12:00) + 0.5 day (12h) = 07-03 00:00
    expect(effectiveExpiresAt(extended!)).toBe("2026-07-03T00:00:00.000Z");
  });
});

describe("removeCandidate", () => {
  it("deletes the record AND purges the candidate's state keys (frees the email)", async () => {
    const minted = await mintCandidate({ name: "Gone", email: "gone@example.com" });
    await backend().set(`cand:${minted.code}:sess:x`, { cart: [] });
    await backend().set(`cand:${minted.code}:orders`, []);

    await removeCandidate(minted.code);

    expect(await getCandidate(minted.code)).toBeNull();
    expect(await backend().get(`cand:${minted.code}:sess:x`)).toBeNull();
    expect(await backend().get(`cand:${minted.code}:orders`)).toBeNull();
    expect(await findCandidateByEmail("gone@example.com")).toBeNull(); // email reusable
  });
});

describe("markStarted", () => {
  it("stamps the current attempt on first open; no-op on a second open", async () => {
    const minted = await mintCandidate({ name: "Start", email: "start@example.com" });

    await markStarted(minted.code);
    const first = currentAttempt((await getCandidate(minted.code))!).startedAt;
    expect(first).toBe("2026-07-01T12:00:00.000Z");

    vi.advanceTimersByTime(2 * HOUR_MS);
    await markStarted(minted.code);
    expect(currentAttempt((await getCandidate(minted.code))!).startedAt).toBe(first);
  });

  it("stamps the NEW attempt after a re-grant (attempt 2), leaving attempt 1's startedAt intact", async () => {
    const minted = await mintCandidate({ name: "Two", email: "two@example.com" });
    await markStarted(minted.code); // attempt 1 started
    await revokeCandidate(minted.code);
    vi.advanceTimersByTime(DAY_MS);
    await regrantCandidate(minted.code, 5); // attempt 2, not started yet

    vi.advanceTimersByTime(HOUR_MS);
    await markStarted(minted.code); // stamps attempt 2

    const record = (await getCandidate(minted.code))!;
    expect(record.attempts[0].startedAt).toBe("2026-07-01T12:00:00.000Z");
    expect(record.attempts[1].startedAt).toBe("2026-07-02T13:00:00.000Z");
  });
});

describe("candidateHasAccess", () => {
  it("is true only when active and unexpired", async () => {
    const active = await mintCandidate({ name: "A", email: "a@example.com", windowDays: 1 });
    expect(await candidateHasAccess(active.code)).toBe(true);

    const revoked = await mintCandidate({ name: "B", email: "b@example.com" });
    await revokeCandidate(revoked.code);
    expect(await candidateHasAccess(revoked.code)).toBe(false);

    expect(await candidateHasAccess("deadbeef")).toBe(false); // unknown
    expect(await candidateHasAccess("NOT VALID!!")).toBe(false); // malformed
  });
});
