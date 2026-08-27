import { afterEach, describe, expect, it, vi } from "vitest";

// Pin the flag source in-memory (the committed data/bug-flags.json is the
// DEPLOY profile — currently all-ON — not a test fixture). The real gating
// engine still runs; only the file read is replaced.
let fileFlags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => fileFlags,
}));

import { isBugActive, isBugActiveWith, type GatingUser } from "@/lib/bugs";
import type { BugFlags } from "@/lib/bug-flags";

// Slice 3 — the safety-critical core. A leak here (an admin seeing a bug, or a
// disabled flag still firing) corrupts every assessment, so the full truth table
// is exercised exhaustively. isBugActiveWith is the pure core (flags injected);
// isBugActive is the flag-file-loading wrapper over that core.

const ADMIN: GatingUser = { role: "admin" };
const QA_AUTOMATION: GatingUser = { role: "qa_automation" };
const CUSTOMER: GatingUser = { role: "customer" };
const NO_USER: GatingUser = null;

// A real registered assessment bug key, used purely to exercise the gating
// engine (the engine is bug-agnostic — it only checks registry membership +
// flag state + role).
const KNOWN_KEY = "FN_PRICE_DECIMALS";
const UNKNOWN_KEY = "NOT_A_REAL_BUG";

const enabled: BugFlags = { [KNOWN_KEY]: true };
const disabled: BugFlags = { [KNOWN_KEY]: false };

// AC 5: active only when the flag is enabled AND the user is not an admin.
describe("isBugActiveWith — enabled flag", () => {
  it("returns true for a customer (AC 5: enabled + non-admin)", () => {
    expect(isBugActiveWith(enabled, KNOWN_KEY, CUSTOMER)).toBe(true);
  });

  // AC 6: the critical admin-safety guard — admins always see the clean app.
  it("returns false for an admin even when the flag is enabled (AC 6)", () => {
    expect(isBugActiveWith(enabled, KNOWN_KEY, ADMIN)).toBe(false);
  });

  // Slice 1 (Phase 6): the bypass choke point now covers qa_automation too —
  // Steve must see the clean app exactly like admin, without becoming admin.
  it("returns false for a qa_automation user even when the flag is enabled (Slice 1 AC)", () => {
    expect(isBugActiveWith(enabled, KNOWN_KEY, QA_AUTOMATION)).toBe(false);
  });

  // AC 8: a null/unauthenticated user is treated as non-admin and follows the flag.
  it("returns true for a null user when the flag is enabled (AC 8: null is non-admin)", () => {
    expect(isBugActiveWith(enabled, KNOWN_KEY, NO_USER)).toBe(true);
  });
});

// AC 7: a disabled flag is never active, regardless of who is asking.
describe("isBugActiveWith — disabled flag", () => {
  it.each([
    ["a customer", CUSTOMER],
    ["an admin", ADMIN],
    ["a qa_automation user", QA_AUTOMATION],
    ["a null user", NO_USER],
  ])("returns false for %s when the flag is disabled (AC 7)", (_label, user) => {
    expect(isBugActiveWith(disabled, KNOWN_KEY, user)).toBe(false);
  });

  it("returns false when the key is absent from the flag map entirely", () => {
    expect(isBugActiveWith({}, KNOWN_KEY, CUSTOMER)).toBe(false);
  });

  it.each([
    ["the string \"true\"", "true"],
    ["the number 1", 1],
    ["null", null],
    ["undefined", undefined],
  ])(
    "returns false when the stored value is %s rather than boolean true",
    (_label, value) => {
      const flags = { [KNOWN_KEY]: value } as unknown as BugFlags;
      expect(isBugActiveWith(flags, KNOWN_KEY, CUSTOMER)).toBe(false);
    },
  );
});

// AC 9: an unknown key is never active and must not throw, even if the flag map
// somehow contains an enabled entry for it (registry is the gate, not the file).
describe("isBugActiveWith — unknown key", () => {
  it.each([
    ["a customer", CUSTOMER],
    ["an admin", ADMIN],
    ["a qa_automation user", QA_AUTOMATION],
    ["a null user", NO_USER],
  ])("returns false for an unknown key with %s (AC 9)", (_label, user) => {
    expect(isBugActiveWith(enabled, UNKNOWN_KEY, user)).toBe(false);
  });

  it("does not throw for an unknown key even when its flag is enabled (AC 9)", () => {
    const flags = { [UNKNOWN_KEY]: true } as BugFlags;
    expect(() => isBugActiveWith(flags, UNKNOWN_KEY, CUSTOMER)).not.toThrow();
    expect(isBugActiveWith(flags, UNKNOWN_KEY, CUSTOMER)).toBe(false);
  });

  it("returns false for an empty-string key without throwing", () => {
    expect(() => isBugActiveWith(enabled, "", CUSTOMER)).not.toThrow();
    expect(isBugActiveWith(enabled, "", CUSTOMER)).toBe(false);
  });
});

// AC 10 (wrapper): isBugActive resolves the flag from the flag file and feeds
// the same gating core — flag off → inactive for everyone; flag on → active
// for non-admins only (admin-clean guaranteed by the engine).
describe("isBugActive — flag-file-loading wrapper", () => {
  afterEach(() => {
    fileFlags = {};
  });

  it.each([
    ["a customer", CUSTOMER],
    ["an admin", ADMIN],
    ["a qa_automation user", QA_AUTOMATION],
    ["a null user", NO_USER],
  ])("returns false for a real bug key with %s when its flag is off", (_label, user) => {
    fileFlags = { [KNOWN_KEY]: false };
    expect(isBugActive(KNOWN_KEY, user)).toBe(false);
  });

  it("returns true for a customer when the file enables the flag", () => {
    fileFlags = { [KNOWN_KEY]: true };
    expect(isBugActive(KNOWN_KEY, CUSTOMER)).toBe(true);
  });

  it("returns false for an admin even when the file enables the flag", () => {
    fileFlags = { [KNOWN_KEY]: true };
    expect(isBugActive(KNOWN_KEY, ADMIN)).toBe(false);
  });

  it("returns false for a qa_automation user even when the file enables the flag", () => {
    fileFlags = { [KNOWN_KEY]: true };
    expect(isBugActive(KNOWN_KEY, QA_AUTOMATION)).toBe(false);
  });
});

// AC 10: the gating pattern must actually switch behavior — the buggy branch is
// reachable, but ONLY when the flag is enabled for a non-admin. We exercise the
// documented "isBugActiveWith(...) ? buggy() : correct()" shape directly with
// injected flags (no filesystem) to prove the switch flips.
describe("the documented gating pattern switches behavior", () => {
  const correct = () => "correct";
  const buggy = () => "buggy";
  const render = (flags: BugFlags, user: GatingUser) =>
    isBugActiveWith(flags, KNOWN_KEY, user) ? buggy() : correct();

  it("takes the buggy branch only for a customer when the flag is enabled", () => {
    expect(render(enabled, CUSTOMER)).toBe("buggy");
  });

  it("takes the correct branch for an admin even when the flag is enabled", () => {
    expect(render(enabled, ADMIN)).toBe("correct");
  });

  it("takes the correct branch for a qa_automation user even when the flag is enabled", () => {
    expect(render(enabled, QA_AUTOMATION)).toBe("correct");
  });

  it("takes the correct branch for a customer when the flag is disabled", () => {
    expect(render(disabled, CUSTOMER)).toBe("correct");
  });
});
