import { describe, expect, it } from "vitest";

import { gateDecision, OPEN_PATHS, type GateInput } from "@/lib/access/gate";

// Phase 3 — the pure access-gate ruling. middleware.ts is a thin adapter over
// this function, so THIS is where the gate's behavior is pinned exhaustively.

function input(overrides: Partial<GateInput> = {}): GateInput {
  return {
    gateEnabled: true,
    isAdmin: false,
    candidateCode: null,
    candidateExists: false,
    pathname: "/products",
    ...overrides,
  };
}

describe("gate disabled (no Redis env — local dev/demo)", () => {
  it("passes every path with no cookies at all", () => {
    for (const pathname of ["/", "/products", "/cart", "/admin", "/api/cart", "/anything"]) {
      expect(gateDecision(input({ gateEnabled: false, pathname }))).toBe("pass");
    }
  });
});

describe("allowlist paths (no cookies required even when gated)", () => {
  it("covers /start, /closed, /login and the auth API endpoints", () => {
    expect(OPEN_PATHS).toEqual([
      "/start",
      "/closed",
      "/login",
      "/api/auth/login",
      "/api/auth/logout",
    ]);
  });

  it.each([...OPEN_PATHS])("passes %s with no cookies", (pathname) => {
    expect(gateDecision(input({ pathname }))).toBe("pass");
  });

  it("passes /api/auth/login regardless of method semantics (GET-with-query login shares the pathname)", () => {
    // SEC_CREDS_IN_URL submits login as a GET with credentials in the query;
    // the pathname is identical, so one allowlist entry covers both flows.
    expect(gateDecision(input({ pathname: "/api/auth/login" }))).toBe("pass");
  });

  it("does not treat sub-paths of allowlisted paths as open", () => {
    expect(gateDecision(input({ pathname: "/login/extra" }))).toBe("closed");
  });
});

describe("admin session", () => {
  it.each(["/", "/products", "/admin", "/admin/candidates", "/api/admin/candidates", "/api/cart"])(
    "passes %s for an admin",
    (pathname) => {
      expect(gateDecision(input({ isAdmin: true, pathname }))).toBe("pass");
    },
  );

  it("passes an admin even with a stale candidate cookie alongside", () => {
    expect(
      gateDecision(
        input({ isAdmin: true, candidateCode: "deadbeef", candidateExists: false }),
      ),
    ).toBe("pass");
  });
});

describe("candidate cookie", () => {
  it("passes when the cand:<code> access key still exists", () => {
    expect(
      gateDecision(input({ candidateCode: "abc12345", candidateExists: true })),
    ).toBe("pass");
  });

  it("closes when there is no candidate cookie at all", () => {
    expect(gateDecision(input({ candidateCode: null }))).toBe("closed");
  });

  it("closes when the cookie is present but the key has expired or been revoked", () => {
    expect(
      gateDecision(input({ candidateCode: "abc12345", candidateExists: false })),
    ).toBe("closed");
  });

  it("never passes on candidateExists alone (no parsed code → closed)", () => {
    // candidateExists without a parsed code must never pass (defensive: the
    // adapter only sets candidateExists when a code parsed, but the pure rule
    // must not rely on that).
    expect(
      gateDecision(input({ candidateCode: null, candidateExists: true })),
    ).toBe("closed");
  });
});

describe("API paths under the gate", () => {
  it("closes API paths for a visitor with no access (adapter turns this into 403 JSON)", () => {
    expect(gateDecision(input({ pathname: "/api/cart" }))).toBe("closed");
  });

  it("passes API paths for a live candidate", () => {
    expect(
      gateDecision(
        input({ pathname: "/api/cart", candidateCode: "abc12345", candidateExists: true }),
      ),
    ).toBe("pass");
  });
});
