import { describe, expect, it } from "vitest";

import {
  bugRegistry,
  findBugByKey,
  listBugs,
  listBugsByCategory,
  listBugsByDifficulty,
  type BugCategory,
  type BugDifficulty,
} from "@/lib/bug-registry";

const CATEGORIES: BugCategory[] = [
  "functional",
  "accessibility",
  "performance",
  "security",
  "ui",
  "ux",
];
const DIFFICULTIES: BugDifficulty[] = ["easy", "moderate", "difficult", "expert"];

// Slice 3 — the bug registry IS the answer key. Every entry must be well-formed
// and every key unique. This guard matters most as the registry grows to ~45.

// AC 1: each entry has key, title, category, difficulty, location, and a boolean hipaa.
describe("bug registry entry shape", () => {
  it("contains at least one entry", () => {
    expect(bugRegistry.length).toBeGreaterThan(0);
  });

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a non-empty string key",
    (_key, bug) => {
      expect(typeof bug.key).toBe("string");
      expect(bug.key.length).toBeGreaterThan(0);
    },
  );

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a non-empty string title",
    (_key, bug) => {
      expect(typeof bug.title).toBe("string");
      expect(bug.title.length).toBeGreaterThan(0);
    },
  );

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a non-empty string location",
    (_key, bug) => {
      expect(typeof bug.location).toBe("string");
      expect(bug.location.length).toBeGreaterThan(0);
    },
  );

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a category drawn from the allowed set",
    (_key, bug) => {
      expect(CATEGORIES).toContain(bug.category);
    },
  );

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a difficulty drawn from the allowed set",
    (_key, bug) => {
      expect(DIFFICULTIES).toContain(bug.difficulty);
    },
  );

  it.each(bugRegistry.map((bug) => [bug.key, bug] as const))(
    "%s has a boolean hipaa flag",
    (_key, bug) => {
      expect(typeof bug.hipaa).toBe("boolean");
    },
  );
});

// AC 2: every registry key is unique. The single most important registry guard —
// a duplicate key would let two bugs share one flag and corrupt assessments.
describe("bug registry key uniqueness", () => {
  it("has no duplicate keys across the whole registry", () => {
    const keys = bugRegistry.map((bug) => bug.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("listBugs", () => {
  it("returns one entry per registry bug", () => {
    expect(listBugs()).toHaveLength(bugRegistry.length);
  });

  it("returns copies so mutating the result does not mutate the registry", () => {
    const first = listBugs();
    first[0].title = "tampered";
    first[0].hipaa = !first[0].hipaa;

    expect(listBugs()).toEqual(bugRegistry.map((bug) => ({ ...bug })));
  });
});

// AC 1 (lookup) — registry is queryable by key for both hits and misses.
describe("findBugByKey", () => {
  it("returns the matching definition for a known key", () => {
    const bug = findBugByKey("PROBE_NOOP");

    expect(bug).not.toBeNull();
    expect(bug?.key).toBe("PROBE_NOOP");
  });

  it("returns null for a key not in the registry", () => {
    expect(findBugByKey("NOT_A_REAL_BUG")).toBeNull();
  });

  it("returns null for an empty key", () => {
    expect(findBugByKey("")).toBeNull();
  });

  it("matches keys case-sensitively (does not match a different case)", () => {
    expect(findBugByKey("probe_noop")).toBeNull();
  });

  it("returns a copy so mutating the result does not mutate the registry", () => {
    const bug = findBugByKey("PROBE_NOOP");
    if (bug) {
      bug.title = "tampered";
    }

    expect(findBugByKey("PROBE_NOOP")?.title).not.toBe("tampered");
  });
});

describe("listBugsByCategory and listBugsByDifficulty", () => {
  it("returns only bugs matching the requested category", () => {
    const functional = listBugsByCategory("functional");

    expect(functional.every((bug) => bug.category === "functional")).toBe(true);
    expect(functional).toHaveLength(
      bugRegistry.filter((bug) => bug.category === "functional").length,
    );
  });

  it("returns an empty array for a category with no bugs", () => {
    expect(listBugsByCategory("security")).toHaveLength(
      bugRegistry.filter((bug) => bug.category === "security").length,
    );
  });

  it("returns only bugs matching the requested difficulty", () => {
    const easy = listBugsByDifficulty("easy");

    expect(easy.every((bug) => bug.difficulty === "easy")).toBe(true);
    expect(easy).toHaveLength(
      bugRegistry.filter((bug) => bug.difficulty === "easy").length,
    );
  });
});
