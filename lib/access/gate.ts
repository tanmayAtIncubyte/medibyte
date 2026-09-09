// The access-gate DECISION, extracted as a pure function so it can be tested
// exhaustively without Next middleware plumbing. middleware.ts is a thin
// adapter that gathers the inputs (env, cookies, KV existence) and applies
// this ruling.

import type { UserRole } from "@/data/users";

/**
 * Paths reachable with NO cookies at all, gate or not:
 * - /start   — the candidate's entry point (it MINTS the cookie)
 * - /closed  — where locked-out visitors land (must never itself be gated)
 * - /login   — the admin has no session yet when signing in
 * - /api/auth/login  — the login submit (POST normally; GET when the seeded
 *                      SEC_CREDS_IN_URL bug drives a query-string login — the
 *                      pathname is the same either way)
 * - /api/auth/logout — always allow signing out
 * - /api/health — unauthenticated config/health probe (booleans only)
 */
export const OPEN_PATHS: readonly string[] = [
  "/start",
  "/closed",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
];

export type GateDecision = "pass" | "closed";

export type GateInput = {
  /** False when no Redis env is configured (local dev/demo) — gate is off. */
  gateEnabled: boolean;
  /** True when a verified admin session cookie is present. */
  isAdmin: boolean;
  /**
   * The verified session role, or null when unauthenticated. Lets the
   * `qa_automation` account (Steve) bypass the candidate gate the same way an
   * admin does, so automation suites can drive the clean app on the deploy.
   * This does NOT grant admin access — `/admin` and `/api/admin/*` are guarded
   * separately by `role === "admin"`. It is an explicit allowlist by role: a
   * null/unknown role never bypasses.
   */
  role: UserRole | null;
  /** The parsed mb_cand cookie value, or null when absent/malformed. */
  candidateCode: string | null;
  /** Whether the candidate is active AND unexpired (a revoked/expired candidate still exists but is not active). */
  candidateActive: boolean;
  pathname: string;
};

export function gateDecision(input: GateInput): GateDecision {
  if (!input.gateEnabled) {
    return "pass";
  }
  if (OPEN_PATHS.includes(input.pathname)) {
    return "pass";
  }
  if (input.isAdmin) {
    return "pass";
  }
  // qa_automation (Steve) bypasses the candidate gate like admin — a separate,
  // explicit role allowlist (never `role !== "customer"`), so a null/unknown
  // role is never let through. Admin authorization stays a distinct check.
  if (input.role === "qa_automation") {
    return "pass";
  }
  if (input.candidateCode !== null && input.candidateActive) {
    return "pass";
  }
  return "closed";
}
