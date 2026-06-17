import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bugRegistry } from "@/lib/bug-registry";

// Slice 5 — the heart of this slice: the flag writers + the runtime read that
// loadBugFlags performs. These are exercised against a REAL temporary file so
// persistence is genuinely tested (not mocked away), proving the restart
// semantics: every load reads the file fresh from disk.
//
// FLAG_FILE is computed once at module load as
//   path.join(process.cwd(), "data", "bug-flags.json")
// so to redirect writes into a temp dir we stub process.cwd() BEFORE importing
// the module, with vi.resetModules() so each test gets a fresh module instance
// bound to the temp path. The repo's real data/bug-flags.json is never touched
// by these tests.

const registryKeys = bugRegistry.map((bug) => bug.key);
// A real registered key used as the sample flag in these writer round-trips.
const PROBE = "FN_PRICE_DECIMALS";

let tempRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

type FlagModule = typeof import("@/lib/bug-flags");

// Stub cwd at the temp dir, reset the module registry, and import a fresh copy
// of lib/bug-flags whose FLAG_FILE now lives under the temp dir.
async function loadModuleInTempDir(): Promise<FlagModule> {
  vi.resetModules();
  return import("@/lib/bug-flags");
}

function tempFlagPath(): string {
  return path.join(tempRoot, "data", "bug-flags.json");
}

function readTempFile(): unknown {
  return JSON.parse(readFileSync(tempFlagPath(), "utf8"));
}

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "medibyte-flags-"));
  mkdirSync(path.join(tempRoot, "data"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempRoot);
});

afterEach(() => {
  cwdSpy.mockRestore();
  vi.resetModules();
  rmSync(tempRoot, { recursive: true, force: true });
});

// AC 5/6 — a write is durably persisted to the flag file, and a subsequent
// load reads it back fresh from disk (the restart-persistence semantics: the
// file, not in-memory state, is the source of truth).
describe("saveBugFlags + loadBugFlags — round-trip persistence", () => {
  it("writes the flag to disk so a fresh load reflects the new value", async () => {
    const writer = await loadModuleInTempDir();
    writer.saveBugFlags({ [PROBE]: true });

    // A brand-new module instance simulates a fresh process reading the file.
    const reader = await loadModuleInTempDir();
    expect(reader.loadBugFlags()[PROBE]).toBe(true);
  });

  it("persists the enabled value as real JSON in the flag file", async () => {
    const writer = await loadModuleInTempDir();
    writer.saveBugFlags({ [PROBE]: true });

    expect(readTempFile()).toMatchObject({ [PROBE]: true });
  });
});

// AC 5/6 — setBugFlag merges a single key without disturbing others. We assert
// the result is a complete, normalized registry map (every key present, others
// untouched).
describe("setBugFlag — single-key merge", () => {
  it("enables exactly the requested key and loads it back as true", async () => {
    const writer = await loadModuleInTempDir();
    writer.setBugFlag(PROBE, true);

    const reader = await loadModuleInTempDir();
    expect(reader.loadBugFlags()[PROBE]).toBe(true);
  });

  it("disables a previously-enabled key without throwing away the rest of the map", async () => {
    const writer = await loadModuleInTempDir();
    writer.setBugFlag(PROBE, true);
    writer.setBugFlag(PROBE, false);

    const reader = await loadModuleInTempDir();
    const flags = reader.loadBugFlags();
    expect(flags[PROBE]).toBe(false);
    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
  });
});

// AC 10 — reset returns the known clean baseline: every flag disabled.
describe("resetBugFlags — clean baseline", () => {
  it("turns every flag off and persists the all-disabled state", async () => {
    const writer = await loadModuleInTempDir();
    writer.setBugFlag(PROBE, true);
    writer.resetBugFlags();

    const reader = await loadModuleInTempDir();
    const flags = reader.loadBugFlags();
    for (const key of registryKeys) {
      expect(flags[key]).toBe(false);
    }
  });
});

// The file can't be corrupted: normalize-before-write drops unknown keys and
// coerces non-booleans, so a bad write never leaves a poisoned flag file.
describe("saveBugFlags — normalizes before writing (file can't be corrupted)", () => {
  it("drops unknown keys so they never reach the file", async () => {
    const writer = await loadModuleInTempDir();
    writer.saveBugFlags({ [PROBE]: true, TOTALLY_FAKE: true } as never);

    expect(Object.keys(readTempFile() as object).sort()).toEqual(
      [...registryKeys].sort(),
    );
  });

  it("coerces a non-boolean value to false on disk", async () => {
    const writer = await loadModuleInTempDir();
    writer.saveBugFlags({ [PROBE]: "true" } as never);

    expect((readTempFile() as Record<string, boolean>)[PROBE]).toBe(false);
  });
});

// AC: a missing or malformed flag file normalizes to all-disabled and never
// throws — the fail-safe that keeps a corrupt/absent file from activating bugs.
describe("loadBugFlags — missing or malformed file is fail-safe", () => {
  it("returns all-disabled when the file does not exist", async () => {
    // beforeEach made the data dir but no file yet.
    const reader = await loadModuleInTempDir();
    const flags = reader.loadBugFlags();

    expect(Object.keys(flags).sort()).toEqual([...registryKeys].sort());
    for (const key of registryKeys) {
      expect(flags[key]).toBe(false);
    }
  });

  it("returns all-disabled for malformed JSON without throwing", async () => {
    writeFileSync(tempFlagPath(), "{ not valid json", "utf8");

    const reader = await loadModuleInTempDir();
    let flags: Record<string, boolean> = {};
    expect(() => {
      flags = reader.loadBugFlags();
    }).not.toThrow();
    for (const key of registryKeys) {
      expect(flags[key]).toBe(false);
    }
  });
});
