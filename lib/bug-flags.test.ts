import { describe, expect, it } from "vitest";

import { loadBugFlags, normalizeFlags } from "@/lib/bug-flags";
import { bugRegistry } from "@/lib/bug-registry";

const registryKeys = bugRegistry.map((bug) => bug.key);

// A real registered key used as the sample flag in these tests.
const SAMPLE_KEY = "FN_PRICE_DECIMALS";

// Slice 3 — normalizeFlags rebuilds the flag map from the registry (the source of
// truth). Anything missing, malformed, or non-boolean must default to disabled
// (false) and must never throw. This is the fail-safe that keeps a corrupt or
// absent flag file from accidentally activating bugs.

// AC 3: every registry key is present in the normalized result.
describe("normalizeFlags — registry coverage", () => {
  it("includes every registry key in the result", () => {
    const flags = normalizeFlags({ [SAMPLE_KEY]: true });

    for (const key of registryKeys) {
      expect(flags).toHaveProperty(key);
    }
  });

  it("includes no keys beyond the registry (registry is source of truth)", () => {
    const flags = normalizeFlags({ [SAMPLE_KEY]: true, UNKNOWN_KEY: true });

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
  });

  it("passes a genuine enabled flag through as true", () => {
    expect(normalizeFlags({ [SAMPLE_KEY]: true })[SAMPLE_KEY]).toBe(true);
  });

  it("passes a genuine disabled flag through as false", () => {
    expect(normalizeFlags({ [SAMPLE_KEY]: false })[SAMPLE_KEY]).toBe(false);
  });
});

// AC 4: a key absent from the stored source defaults to disabled.
describe("normalizeFlags — missing key defaults to disabled", () => {
  it("defaults a key absent from the source to false", () => {
    const flags = normalizeFlags({});

    for (const key of registryKeys) {
      expect(flags[key]).toBe(false);
    }
  });
});

// AC 4: a non-boolean value must be coerced to disabled, never treated as enabled.
describe("normalizeFlags — non-boolean values default to disabled", () => {
  it.each([
    ["the string \"true\"", "true"],
    ["the string \"false\"", "false"],
    ["the number 1", 1],
    ["the number 0", 0],
    ["null", null],
    ["undefined", undefined],
    ["an object", {}],
    ["an array", []],
  ])("treats %s as disabled", (_label, value) => {
    const flags = normalizeFlags({ [SAMPLE_KEY]: value });

    expect(flags[SAMPLE_KEY]).toBe(false);
  });
});

// AC 4: a missing/empty/malformed source must yield all-disabled and never throw.
describe("normalizeFlags — missing or malformed source", () => {
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an empty object", {}],
    ["an array", [] as unknown],
    ["a string", "not an object" as unknown],
    ["a number", 42 as unknown],
    ["a boolean", true as unknown],
  ])("returns all keys disabled for %s without throwing", (_label, source) => {
    let flags: Record<string, boolean> = {};
    expect(() => {
      flags = normalizeFlags(source);
    }).not.toThrow();

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
    for (const key of registryKeys) {
      expect(flags[key]).toBe(false);
    }
  });
});

// AC 3: the file-loading wrapper reads the real committed flag file. The file
// is the DEPLOY profile (which flags are on is an operator decision, not a
// test fixture), so assert shape/validity — full key coverage, boolean values —
// not any particular on/off state.
describe("loadBugFlags — real flag file", () => {
  it("includes every registry key", () => {
    const flags = loadBugFlags();

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
  });

  it("normalizes every value to a boolean", () => {
    const flags = loadBugFlags();

    expect(typeof flags[SAMPLE_KEY]).toBe("boolean");
    for (const key of registryKeys) {
      expect(typeof flags[key]).toBe("boolean");
    }
  });
});
