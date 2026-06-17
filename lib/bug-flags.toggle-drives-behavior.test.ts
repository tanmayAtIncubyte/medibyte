import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GatingUser } from "@/lib/bugs";

// Slice 5, AC 7 — the panel's write must actually drive behavior. After
// setBugFlag(SAMPLE_KEY, true) writes the flag file, a subsequent
// isBugActive(SAMPLE_KEY, customer) must read that file fresh and return true,
// while an admin still gets the clean app (false). This closes the loop end to
// end: write → file → gate, against a REAL temp file (no fs mocking).
//
// bugs.ts reads flags via lib/bug-flags#loadBugFlags, so both modules are
// imported together after vi.resetModules() so they share the same temp-dir
// FLAG_FILE binding (process.cwd() is stubbed before import).

const CUSTOMER: GatingUser = { role: "customer" };
const ADMIN: GatingUser = { role: "admin" };

// A real registered key used to drive the engine end-to-end.
const SAMPLE_KEY = "FN_PRICE_DECIMALS";

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

    expect(bugsModule.isBugActive(SAMPLE_KEY, CUSTOMER)).toBe(false);

    flagsModule.setBugFlag(SAMPLE_KEY, true);

    expect(bugsModule.isBugActive(SAMPLE_KEY, CUSTOMER)).toBe(true);
  });

  it("still returns false for an admin even after the flag is enabled (admin safety)", async () => {
    const { flagsModule, bugsModule } = await loadModulesInTempDir();
    flagsModule.setBugFlag(SAMPLE_KEY, true);

    expect(bugsModule.isBugActive(SAMPLE_KEY, ADMIN)).toBe(false);
  });

  it("deactivates the bug again after the flag is turned back off", async () => {
    const { flagsModule, bugsModule } = await loadModulesInTempDir();
    flagsModule.setBugFlag(SAMPLE_KEY, true);
    flagsModule.setBugFlag(SAMPLE_KEY, false);

    expect(bugsModule.isBugActive(SAMPLE_KEY, CUSTOMER)).toBe(false);
  });
});
