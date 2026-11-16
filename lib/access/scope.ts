// Request-scoped state namespace.
//
// A candidate (identified by the mb_cand cookie set at /start) gets an
// isolated `cand:<code>` namespace: their cart, orders, stock ledger,
// registrations and account edits all live under it and share the access
// window's TTL — the candidate's whole world expires with their access, and
// candidates can't contaminate each other's stock/oversell repros. Everyone
// else (admin/reviewer, local dev, tests) shares "main" with no expiry.

import { cookies } from "next/headers";

export const CANDIDATE_COOKIE = "mb_cand";
export const DEFAULT_CANDIDATE_WINDOW_DAYS = 10;
// Per-candidate STATE (cart/orders/…) auto-cleanup TTL. Deliberately generous
// and DECOUPLED from the access window: access is governed by the (persistent)
// candidate record's expiry, while this is only a safety net so a candidate's
// work survives their window and short/fractional windows never delete it
// mid-assessment. `removeCandidate` is the real cleanup.
export const CANDIDATE_STATE_TTL_DAYS = 60;

/** Candidate codes are minted as lowercase slugs; reject anything else. */
const CODE_SHAPE = /^[a-z0-9][a-z0-9-]{2,63}$/;

export function parseCandidateCode(value: string | undefined): string | null {
  return value && CODE_SHAPE.test(value) ? value : null;
}

/**
 * The namespace for the current request: `cand:<code>` when a valid candidate
 * cookie is present, otherwise "main". Outside a request scope (unit tests
 * calling services directly) there are no cookies — that's "main" too.
 */
export async function currentScope(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const code = parseCandidateCode(cookieStore.get(CANDIDATE_COOKIE)?.value);
    return code ? `cand:${code}` : "main";
  } catch {
    return "main";
  }
}

/**
 * TTL for state written in a scope: candidate state expires with the access
 * window; "main" state never expires.
 */
export function scopeTtlSeconds(scope: string): number | undefined {
  return scope.startsWith("cand:")
    ? CANDIDATE_STATE_TTL_DAYS * 86_400
    : undefined;
}
