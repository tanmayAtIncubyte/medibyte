import { describe, expect, it } from "vitest";

import { isBugActive, isBugActiveWith, type GatingUser } from "@/lib/bugs";
import type { BugFlags } from "@/lib/bug-flags";

// Slice 3 — the safety-critical core. A leak here (an admin seeing a bug, or a
// disabled flag still firing) corrupts every assessment, so the full truth table
// is exercised exhaustively. isBugActiveWith is the pure core (flags injected);
// isBugActive is the file-loading wrapper over the real all-disabled baseline.

const ADMIN: GatingUser = { role: "admin" };
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

// AC 10 (wrapper): isBugActive reads the real committed all-disabled baseline,
// so every bug is inactive for everyone (default flags are OFF).
describe("isBugActive — file-loading wrapper over the all-disabled baseline", () => {
  it.each([
    ["a customer", CUSTOMER],
    ["an admin", ADMIN],
    ["a null user", NO_USER],
  ])("returns false for a real bug key with %s (baseline is clean)", (_label, user) => {
    expect(isBugActive(KNOWN_KEY, user)).toBe(false);
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

  it("takes the correct branch for a customer when the flag is disabled", () => {
    expect(render(disabled, CUSTOMER)).toBe("correct");
  });
});
