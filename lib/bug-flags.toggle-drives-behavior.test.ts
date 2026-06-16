import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GatingUser } from "@/lib/bugs";

// Slice 5, AC 7 — the panel's write must actually drive behavior. After
// setBugFlag(PROBE_NOOP, true) writes the flag file, a subsequent
// isBugActive('PROBE_NOOP', customer) must read that file fresh and return true,
// while an admin still gets the clean app (false). This closes the loop end to
// end: write → file → gate, against a REAL temp file (no fs mocking).
//
// bugs.ts reads flags via lib/bug-flags#loadBugFlags, so both modules are
// imported together after vi.resetModules() so they share the same temp-dir
// FLAG_FILE binding (process.cwd() is stubbed before import).

const CUSTOMER: GatingUser = { role: "customer" };
const ADMIN: GatingUser = { role: "admin" };

let tempRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

async function loadModulesInTempDir() {
  vi.resetModules();
  const flagsModule = await import("@/lib/bug-flags");
  const bugsModule = await import("@/lib/bugs");
  return { flagsModule, bugsModule };
}

beforeEach(() => {
  tempRoot = mkdtempSync(path.join(tmpdir(), "medibyte-toggle-"));
  mkdirSync(path.join(tempRoot, "data"), { recursive: true });
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempRoot);
});

afterEach(() => {
  cwdSpy.mockRestore();
  vi.resetModules();
  rmSync(tempRoot, { recursive: true, force: true });
});

describe("toggle drives isBugActive (AC 7)", () => {
  it("activates the bug for a customer after the flag is enabled", async () => {
    const { flagsModule, bugsModule } = await loadModulesInTempDir();

    expect(bugsModule.isBugActive("PROBE_NOOP", CUSTOMER)).toBe(false);

    flagsModule.setBugFlag("PROBE_NOOP", true);

    expect(bugsModule.isBugActive("PROBE_NOOP", CUSTOMER)).toBe(true);
  });

  it("still returns false for an admin even after the flag is enabled (admin safety)", async () => {
    const { flagsModule, bugsModule } = await loadModulesInTempDir();
    flagsModule.setBugFlag("PROBE_NOOP", true);

    expect(bugsModule.isBugActive("PROBE_NOOP", ADMIN)).toBe(false);
  });

  it("deactivates the bug again after the flag is turned back off", async () => {
    const { flagsModule, bugsModule } = await loadModulesInTempDir();
    flagsModule.setBugFlag("PROBE_NOOP", true);
    flagsModule.setBugFlag("PROBE_NOOP", false);

    expect(bugsModule.isBugActive("PROBE_NOOP", CUSTOMER)).toBe(false);
  });
});
