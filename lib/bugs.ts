import { findBugByKey, type BugKey } from "@/lib/bug-registry";
import { loadBugFlags, type BugFlags } from "@/lib/bug-flags";

// Minimal shape of the current user that gating needs. Slice 4 supplies the
// real signed-cookie session user; null means unauthenticated / no user.
export type GatingUser = { role: "admin" | "customer" } | null;

// Pure core of the gating contract — a function of (flags, key, user) only, so
// it is trivially unit-testable without touching the filesystem.
//
// A bug is active ONLY when ALL hold:
//   - the key exists in the registry (unknown keys are never active),
//   - its flag is enabled, AND
//   - the user is not an admin (admins always see the clean reference app;
//     a null/unauthenticated user is treated as non-admin and may see bugs).
export function isBugActiveWith(flags: BugFlags, key: string, user: GatingUser): boolean {
  if (!findBugByKey(key)) {
    return false;
  }
  if (flags[key] !== true) {
    return false;
  }
  if (user?.role === "admin") {
    return false;
  }
  return true;
}

// File-loading wrapper matching the spec's gating contract. Reads the current
// flag state from data/bug-flags.json (via the normalizing loader) and applies
// the pure core.
export function isBugActive(key: BugKey, user: GatingUser): boolean {
  return isBugActiveWith(loadBugFlags(), key, user);
}

// ---------------------------------------------------------------------------
// The intended code pattern — documented and demonstrated once.
//
// Every later feature follows this shape: the CORRECT path is the default, and
// the BUGGY path is the gated branch. Never invert it. This keeps the clean and
// buggy builds from drifting and makes each bug independently testable.
//
//   const total = isBugActive("CART_TAX_ROUNDING", user) ? buggyTax(x) : correctTax(x);
//
// `describeProbe` below proves the engine end-to-end against the throwaway
// PROBE_NOOP key without affecting real UX. It is a Phase-1 probe only.
// ---------------------------------------------------------------------------
export function describeProbe(user: GatingUser): string {
  return isBugActive("PROBE_NOOP", user) ? buggyProbe() : correctProbe();
}

function correctProbe(): string {
  return "MediByte engine OK";
}

function buggyProbe(): string {
  return "MediByte engine PROBE (buggy path)";
}
