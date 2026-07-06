import { describe, expect, it } from "vitest";

import {
  DEFAULT_CANDIDATE_WINDOW_DAYS,
  currentScope,
  parseCandidateCode,
  scopeTtlSeconds,
} from "@/lib/access/scope";

// The namespace every store key is prefixed with. parseCandidateCode guards
// the cookie value (it becomes part of a storage key, so junk must be
// rejected); currentScope must degrade to "main" outside a request scope so
// unit tests can drive the services directly.

describe("parseCandidateCode", () => {
  it("accepts a lowercase slug", () => {
    expect(parseCandidateCode("pat-2026")).toBe("pat-2026");
  });

  it("accepts digits and hyphens after the first character", () => {
    expect(parseCandidateCode("a1b-2c3")).toBe("a1b-2c3");
  });

  it("rejects undefined and the empty string", () => {
    expect(parseCandidateCode(undefined)).toBeNull();
    expect(parseCandidateCode("")).toBeNull();
  });

  it("rejects codes shorter than 3 characters", () => {
    expect(parseCandidateCode("ab")).toBeNull();
  });

  it("rejects uppercase, whitespace, and key-scheme separators", () => {
    expect(parseCandidateCode("Pat-2026")).toBeNull();
    expect(parseCandidateCode("pat 2026")).toBeNull();
    // ':' delimits store keys, so it must never appear inside a code.
    expect(parseCandidateCode("pat:2026")).toBeNull();
  });

  it("rejects a leading hyphen and over-long codes", () => {
    expect(parseCandidateCode("-pat")).toBeNull();
    expect(parseCandidateCode("a".repeat(65))).toBeNull();
  });
});

describe("currentScope", () => {
  it('returns "main" outside a request scope (no cookies available)', async () => {
    // Unit tests call services directly with no Next request context; the
    // cookies() call throws and currentScope must fall back to "main".
    expect(await currentScope()).toBe("main");
  });
});

describe("scopeTtlSeconds", () => {
  it("gives candidate scopes the access-window ttl", () => {
    expect(scopeTtlSeconds("cand:pat-2026")).toBe(
      DEFAULT_CANDIDATE_WINDOW_DAYS * 86_400,
    );
  });

  it('gives "main" no expiry', () => {
    expect(scopeTtlSeconds("main")).toBeUndefined();
  });
});
