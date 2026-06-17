import { describe, expect, it } from "vitest";

import { users } from "@/data/users";
import { findUserByEmail, listUsers } from "@/lib/data/users";

// Slice 2 — user accessors.
// AC 8: seed must include the accounts auth needs (>= 1 admin + >= 1 customer).
// AC 3/4: deterministic, copies handed out, no shared mutable state.
describe("listUsers", () => {
  it("returns the full seed user set", () => {
    expect(listUsers()).toHaveLength(users.length);
  });

  it("returns identical data on repeated calls (deterministic)", () => {
    expect(listUsers()).toEqual(listUsers());
  });

  it("returns copies so mutating the result does not mutate the seed", () => {
    const first = listUsers();
    first[0].role = "customer";
    first[0].password = "hacked";

    const second = listUsers();
    expect(second).toEqual(users.map((u) => ({ ...u })));
  });
});

// AC 8: at least one admin and at least one customer must exist for auth.
describe("user seed coverage", () => {
  it("includes at least one admin account", () => {
    expect(listUsers().some((u) => u.role === "admin")).toBe(true);
  });

  it("includes at least one customer account", () => {
    expect(listUsers().some((u) => u.role === "customer")).toBe(true);
  });

  it("uses unique emails across the seed", () => {
    const emails = listUsers().map((u) => u.email.toLowerCase());
    expect(new Set(emails).size).toBe(emails.length);
  });
});

describe("findUserByEmail", () => {
  it("returns the matching user for a known email", () => {
    const user = findUserByEmail("admin@medibyte.test");

    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
  });

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    const user = findUserByEmail("  ADMIN@MediByte.TEST  ");

    expect(user?.email).toBe("admin@medibyte.test");
  });

  it("returns null for an unknown email", () => {
    expect(findUserByEmail("nobody@example.test")).toBeNull();
  });

  it("returns a copy so mutating the result does not mutate the seed", () => {
    const user = findUserByEmail("dana@example.test");
    if (user) {
      user.role = "admin";
    }

    expect(findUserByEmail("dana@example.test")?.role).toBe("customer");
  });
});
