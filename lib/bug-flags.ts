import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { bugRegistry } from "@/lib/bug-registry";

export type BugFlags = Record<string, boolean>;

const FLAG_FILE = path.join(process.cwd(), "data", "bug-flags.json");

// Normalize whatever was stored into a complete flag map: every key in the
// registry is guaranteed present, and any key missing from the file (or the
// whole file being absent/malformed) defaults to disabled rather than crashing.
// Unknown keys in the file are ignored — the registry is the source of truth.
// Pure: no filesystem access, so the merge logic is unit-testable on its own.
export function normalizeFlags(source: unknown): BugFlags {
  const stored = isFlagRecord(source) ? source : {};
  const flags: BugFlags = {};
  for (const bug of bugRegistry) {
    flags[bug.key] = stored[bug.key] === true;
  }
  return flags;
}

// Reads the flag file at runtime (not a build-time import) so a write from the
// admin panel is visible to the very next isBugActive/loadBugFlags call without
// a rebuild. A missing or unreadable file normalizes to all-disabled.
export function loadBugFlags(): BugFlags {
  return normalizeFlags(readFlagFile());
}

// Normalizes then writes the flag file. Normalizing before write guarantees the
// file only ever contains known keys with boolean values, so a bad request can
// never corrupt it.
export function saveBugFlags(flags: BugFlags): BugFlags {
  const normalized = normalizeFlags(flags);
  writeFileSync(FLAG_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function setBugFlag(key: string, enabled: boolean): BugFlags {
  return saveBugFlags({ ...loadBugFlags(), [key]: enabled });
}

// Reset to the known clean baseline: every flag disabled.
export function resetBugFlags(): BugFlags {
  return saveBugFlags({});
}

function readFlagFile(): unknown {
  try {
    return JSON.parse(readFileSync(FLAG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function isFlagRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
