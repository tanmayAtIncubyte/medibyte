import { bugRegistry } from "@/lib/bug-registry";
import rawFlags from "@/data/bug-flags.json";

export type BugFlags = Record<string, boolean>;

// Normalize whatever is in bug-flags.json into a complete flag map: every key in
// the registry is guaranteed present, and any key missing from the file (or the
// whole file being absent/malformed) defaults to disabled rather than crashing.
// Unknown keys in the file are ignored — the registry is the source of truth.
export function normalizeFlags(source: unknown): BugFlags {
  const stored = isFlagRecord(source) ? source : {};
  const flags: BugFlags = {};
  for (const bug of bugRegistry) {
    flags[bug.key] = stored[bug.key] === true;
  }
  return flags;
}

export function loadBugFlags(): BugFlags {
  return normalizeFlags(rawFlags);
}

function isFlagRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
