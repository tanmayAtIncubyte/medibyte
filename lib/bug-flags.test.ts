import { describe, expect, it } from "vitest";

import { loadBugFlags, normalizeFlags } from "@/lib/bug-flags";
import { bugRegistry } from "@/lib/bug-registry";

const registryKeys = bugRegistry.map((bug) => bug.key);

// Slice 3 — normalizeFlags rebuilds the flag map from the registry (the source of
// truth). Anything missing, malformed, or non-boolean must default to disabled
// (false) and must never throw. This is the fail-safe that keeps a corrupt or
// absent flag file from accidentally activating bugs.

// AC 3: every registry key is present in the normalized result.
describe("normalizeFlags — registry coverage", () => {
  it("includes every registry key in the result", () => {
    const flags = normalizeFlags({ PROBE_NOOP: true });

    for (const key of registryKeys) {
      expect(flags).toHaveProperty(key);
    }
  });

  it("includes no keys beyond the registry (registry is source of truth)", () => {
    const flags = normalizeFlags({ PROBE_NOOP: true, UNKNOWN_KEY: true });

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
  });

  it("passes a genuine enabled flag through as true", () => {
    expect(normalizeFlags({ PROBE_NOOP: true }).PROBE_NOOP).toBe(true);
  });

  it("passes a genuine disabled flag through as false", () => {
    expect(normalizeFlags({ PROBE_NOOP: false }).PROBE_NOOP).toBe(false);
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
    const flags = normalizeFlags({ PROBE_NOOP: value });

    expect(flags.PROBE_NOOP).toBe(false);
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

// AC 3: the file-loading wrapper reads the real all-disabled baseline.
describe("loadBugFlags — real flag file", () => {
  it("includes every registry key", () => {
    const flags = loadBugFlags();

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
  });

  it("reports the PROBE_NOOP key disabled in the committed baseline", () => {
    expect(loadBugFlags().PROBE_NOOP).toBe(false);
  });
});
