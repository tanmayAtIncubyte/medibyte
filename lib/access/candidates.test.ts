import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  extendCandidate,
  getCandidate,
  listCandidates,
  mintCandidate,
  revokeCandidate,
} from "@/lib/access/candidates";
import { parseCandidateCode } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";

// Phase 3 — the candidate access registry. The `cand:<code>` key IS the access
// authority: native TTL is the timer, DEL is revocation. These tests run
// against the offline in-memory backend (no Redis env), whose TTL is honored
// lazily via Date.now() — so fake timers let us cross the expiry line.

const DAY_MS = 86_400_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-01T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("mintCandidate", () => {
  it("mints an 8-char lowercase hex code that satisfies parseCandidateCode", async () => {
    const minted = await mintCandidate("Priya Sharma");

    expect(minted.code).toMatch(/^[0-9a-f]{8}$/);
    expect(parseCandidateCode(minted.code)).toBe(minted.code);
  });

  it("stores the access record at cand:<code> with name and ISO timestamps", async () => {
    const minted = await mintCandidate("Priya Sharma");

    const stored = await backend().get(`cand:${minted.code}`);
    expect(stored).toEqual({
      name: "Priya Sharma",
      createdAt: "2026-07-01T12:00:00.000Z",
      expiresAt: "2026-07-11T12:00:00.000Z", // default 10-day window
    });
  });

  it("honors a custom window and TTLs the key so it dies when the window lapses", async () => {
    const minted = await mintCandidate("Short Window", 1);

    expect(minted.expiresAt).toBe("2026-07-02T12:00:00.000Z");
    expect(await getCandidate(minted.code)).not.toBeNull();

    vi.advanceTimersByTime(DAY_MS + 1000); // just past the 1-day window

    expect(await getCandidate(minted.code)).toBeNull();
    const codes = (await listCandidates()).map((record) => record.code);
    expect(codes).not.toContain(minted.code);
  });

  it("is listable immediately after minting", async () => {
    const minted = await mintCandidate("Listable");

    const records = await listCandidates();
    expect(records).toContainEqual({ code: minted.code, ...access(minted) });
  });
});

describe("getCandidate", () => {
  it("returns the record for a live code", async () => {
    const minted = await mintCandidate("Live");

    expect(await getCandidate(minted.code)).toEqual(access(minted));
  });

  it("returns null for an unknown (well-formed) code", async () => {
    expect(await getCandidate("deadbeef")).toBeNull();
  });

  it("returns null for a code with an invalid shape", async () => {
    expect(await getCandidate("NOT VALID!!")).toBeNull();
  });

  it("returns null when the stored value is not a CandidateAccess shape", async () => {
    await backend().set("cand:badvalue", "just-a-string");

    expect(await getCandidate("badvalue")).toBeNull();
  });
});

describe("listCandidates", () => {
  it("excludes candidate STATE keys that share the cand: prefix", async () => {
    const minted = await mintCandidate("Real Candidate");
    // A state key namespaced under a candidate scope — matched by the "cand:"
    // prefix scan but NOT an access key (it has segments after the code).
    await backend().set("cand:abc12345:sess:x", { cart: [] });

    const codes = (await listCandidates()).map((record) => record.code);

    expect(codes).toContain(minted.code);
    expect(codes).not.toContain("abc12345");
    expect(codes.every((code) => !code.includes(":"))).toBe(true);
  });
});

describe("revokeCandidate", () => {
  it("deletes the access key: getCandidate is null and the code leaves the list", async () => {
    const minted = await mintCandidate("Revoked Soon");

    await revokeCandidate(minted.code);

    expect(await getCandidate(minted.code)).toBeNull();
    const codes = (await listCandidates()).map((record) => record.code);
    expect(codes).not.toContain(minted.code);
  });
});

describe("extendCandidate", () => {
  it("pushes expiresAt out by extraDays from the old expiry (window still live)", async () => {
    const minted = await mintCandidate("Extended", 10);

    const updated = await extendCandidate(minted.code, 5);

    // old expiry 2026-07-11 + 5 days
    expect(updated?.expiresAt).toBe("2026-07-16T12:00:00.000Z");
    expect(await getCandidate(minted.code)).toEqual(updated);
  });

  it("keeps the key alive past the original window after an extension", async () => {
    const minted = await mintCandidate("Kept Alive", 1);
    await extendCandidate(minted.code, 5);

    vi.advanceTimersByTime(2 * DAY_MS); // past the original 1-day window

    expect(await getCandidate(minted.code)).not.toBeNull();
  });

  it("returns null for an unknown code (extension never resurrects dead access)", async () => {
    expect(await extendCandidate("deadbeef", 10)).toBeNull();
  });
});

function access(minted: { name: string; createdAt: string; expiresAt: string }) {
  return {
    name: minted.name,
    createdAt: minted.createdAt,
    expiresAt: minted.expiresAt,
  };
}
