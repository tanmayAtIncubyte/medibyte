// The canonical list of every bug in MediByte. This file IS the answer key:
// each entry describes one deliberately-seeded defect and where it lives.
// `data/bug-flags.json` is seeded from these keys and `lib/bugs.ts` gates every
// buggy code path through them. No real bugs are seeded in Phase 1 — the single
// PROBE_NOOP entry exists only to prove the toggle engine end-to-end and is
// removed (or replaced by real bugs) in Phase 4.

export type BugCategory =
  | "functional"
  | "accessibility"
  | "performance"
  | "security"
  | "ui"
  | "ux";

export type BugDifficulty = "easy" | "moderate" | "difficult" | "expert";

export type BugDefinition = {
  key: string;
  title: string;
  category: BugCategory;
  difficulty: BugDifficulty;
  location: string;
  hipaa: boolean;
};

export const bugRegistry: readonly BugDefinition[] = [
  {
    key: "PROBE_NOOP",
    title: "Phase-1 engine probe (no-op, not a real bug)",
    category: "functional",
    difficulty: "easy",
    location: "lib/bugs.ts (describeProbe demo)",
    hipaa: false,
  },
] as const;

// Type-safe key union derived from the registry, so callers get autocomplete
// and compile-time checking against the canonical list.
export type BugKey = (typeof bugRegistry)[number]["key"];

export function listBugs(): BugDefinition[] {
  return bugRegistry.map((bug) => ({ ...bug }));
}

export function findBugByKey(key: string): BugDefinition | null {
  const bug = bugRegistry.find((candidate) => candidate.key === key);
  return bug ? { ...bug } : null;
}

export function listBugsByCategory(category: BugCategory): BugDefinition[] {
  return bugRegistry.filter((bug) => bug.category === category).map((bug) => ({ ...bug }));
}

export function listBugsByDifficulty(difficulty: BugDifficulty): BugDefinition[] {
  return bugRegistry.filter((bug) => bug.difficulty === difficulty).map((bug) => ({ ...bug }));
}
