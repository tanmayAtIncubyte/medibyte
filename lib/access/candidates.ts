// Candidate access registry over the KV seam.
//
// A reviewer mints a code; the record lives at `cand:<code>` and PERSISTS (no
// TTL) — it is the roster entry. Access is governed by `status` plus the
// current attempt's `expiresAt` (a COMPUTED check, not key deletion), so a
// revoked or expired candidate stays listed and can be re-granted. Every grant
// (initial mint + each re-grant) is captured as an `attempt` with its own
// grant / start / revoke times, so a returning candidate reads as "Attempt 2".
// `removeCandidate` is the ONLY thing that deletes a record (and purges the
// candidate's state), freeing the email for reuse.
//
// Heavy per-candidate STATE keys (`cand:<code>:*`) still carry a TTL for
// serverless persistence + auto-cleanup (see lib/access/scope.ts); only the
// small access record persists.
//
// These access keys are GLOBAL (no scope prefix): reviewer-facing bookkeeping.

import {
  DEFAULT_CANDIDATE_WINDOW_DAYS,
  parseCandidateCode,
} from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";

export type Attempt = {
  attempt: number; // 1-based
  grantedAt: string; // ISO — when this grant happened
  windowDays: number; // window chosen for this attempt (fractional allowed)
  expiresAt: string; // grantedAt + windowDays
  startedAt?: string; // first /start of THIS attempt
  revokedAt?: string; // set if revoked during this attempt
};

export type CandidateStatus = "active" | "revoked";
export type CandidateDisplayStatus = "active" | "revoked" | "expired";

export type CandidateAccess = {
  name: string;
  email: string;
  role?: string;
  notes?: string;
  createdAt: string; // == attempts[0].grantedAt
  status: CandidateStatus; // "expired" is DERIVED, never stored
  attempts: Attempt[]; // full history; current = last
};

export type CandidateRecord = CandidateAccess & { code: string };

export type MintCandidateInput = {
  name: string;
  email: string;
  windowDays?: number;
  role?: string;
  notes?: string;
};

// An ACCESS key is exactly `cand:<code>` — no further ":" segments. The same
// prefix also matches candidate STATE keys (`cand:<code>:sess:…`), which must
// never surface in the registry.
const ACCESS_KEY_SHAPE = /^cand:[a-z0-9-]+$/;
const DAY_MS = 86_400_000;

function accessKey(code: string): string {
  return `cand:${code}`;
}

function windowExpiry(fromMs: number, windowDays: number): string {
  return new Date(fromMs + windowDays * DAY_MS).toISOString();
}

/** The most recent attempt (the live one). */
export function currentAttempt(record: CandidateAccess): Attempt {
  return record.attempts[record.attempts.length - 1];
}

/** When access lapses = the current attempt's expiry. */
export function effectiveExpiresAt(record: CandidateAccess): string {
  return currentAttempt(record).expiresAt;
}

/** active (live) / revoked / expired — for display AND gating. */
export function displayStatus(record: CandidateAccess): CandidateDisplayStatus {
  if (record.status === "revoked") {
    return "revoked";
  }
  return Date.now() >= Date.parse(effectiveExpiresAt(record)) ? "expired" : "active";
}

/**
 * Mint a new candidate (attempt 1). The code is 8 lowercase hex chars (head of
 * a UUID), satisfying parseCandidateCode. Input is validated at the route;
 * dedup-by-email is enforced there too. Persists with NO TTL — it's a roster
 * entry, not an ephemeral key.
 */
export async function mintCandidate(input: MintCandidateInput): Promise<CandidateRecord> {
  const { name, email, role, notes } = input;
  const windowDays = input.windowDays ?? DEFAULT_CANDIDATE_WINDOW_DAYS;
  const code = crypto.randomUUID().slice(0, 8).toLowerCase();
  const now = Date.now();
  const grantedAt = new Date(now).toISOString();
  const access: CandidateAccess = {
    name,
    email,
    ...(role ? { role } : {}),
    ...(notes ? { notes } : {}),
    createdAt: grantedAt,
    status: "active",
    attempts: [{ attempt: 1, grantedAt, windowDays, expiresAt: windowExpiry(now, windowDays) }],
  };
  await backend().set(accessKey(code), access);
  return { code, ...access };
}

/** Find a roster entry by email (case-insensitive) — for duplicate-mint guard. */
export async function findCandidateByEmail(email: string): Promise<CandidateRecord | null> {
  const target = email.trim().toLowerCase();
  const records = await listCandidates();
  return records.find((record) => record.email.trim().toLowerCase() === target) ?? null;
}

/** The stored record for a code (regardless of expiry — no TTL deletes it now). */
export async function getCandidate(code: string): Promise<CandidateAccess | null> {
  const parsed = parseCandidateCode(code);
  if (!parsed) {
    return null;
  }
  const value = await backend().get<CandidateAccess>(accessKey(parsed));
  return isCandidateAccess(value) ? value : null;
}

/** All roster entries, newest first. Excludes candidate STATE keys. */
export async function listCandidates(): Promise<CandidateRecord[]> {
  const keys = await backend().listKeys("cand:");
  const records = await Promise.all(
    keys
      .filter((key) => ACCESS_KEY_SHAPE.test(key))
      .map(async (key) => {
        const value = await backend().get<CandidateAccess>(key);
        return isCandidateAccess(value) ? { code: key.slice("cand:".length), ...value } : null;
      }),
  );
  return records
    .filter((record): record is CandidateRecord => record !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Revoke (reversible): flip status + stamp the current attempt's revokedAt. Keeps the record + state. */
export async function revokeCandidate(code: string): Promise<CandidateRecord | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  if (existing.status === "revoked") {
    return { code, ...existing };
  }
  const attempts = existing.attempts.map((attempt, index) =>
    index === existing.attempts.length - 1
      ? { ...attempt, revokedAt: new Date().toISOString() }
      : attempt,
  );
  const updated: CandidateAccess = { ...existing, status: "revoked", attempts };
  await backend().set(accessKey(code), updated);
  return { code, ...updated };
}

/** Re-grant: open a NEW attempt with a fresh window; status back to active. Keeps prior attempts + state (resume). */
export async function regrantCandidate(
  code: string,
  windowDays: number,
): Promise<CandidateRecord | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  const now = Date.now();
  const grantedAt = new Date(now).toISOString();
  const attempts: Attempt[] = [
    ...existing.attempts,
    {
      attempt: existing.attempts.length + 1,
      grantedAt,
      windowDays,
      expiresAt: windowExpiry(now, windowDays),
    },
  ];
  const updated: CandidateAccess = { ...existing, status: "active", attempts };
  await backend().set(accessKey(code), updated);
  return { code, ...updated };
}

/** Extend the CURRENT attempt's window by extraDays (fractional). Active candidates only. */
export async function extendCandidate(
  code: string,
  extraDays: number,
): Promise<CandidateRecord | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  const baseMs = Math.max(Date.now(), Date.parse(effectiveExpiresAt(existing)));
  const attempts = existing.attempts.map((attempt, index) =>
    index === existing.attempts.length - 1
      ? { ...attempt, expiresAt: windowExpiry(baseMs, extraDays) }
      : attempt,
  );
  const updated: CandidateAccess = { ...existing, attempts };
  await backend().set(accessKey(code), updated);
  return { code, ...updated };
}

/** Hard delete: remove the roster entry AND purge the candidate's state, freeing the email. */
export async function removeCandidate(code: string): Promise<void> {
  const parsed = parseCandidateCode(code);
  if (!parsed) {
    return;
  }
  await backend().del(accessKey(parsed));
  const stateKeys = await backend().listKeys(`cand:${parsed}:`);
  await Promise.all(stateKeys.map((key) => backend().del(key)));
}

/** Stamp the CURRENT attempt's startedAt on the first /start of that attempt (first-open wins). */
export async function markStarted(code: string): Promise<CandidateRecord | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  if (currentAttempt(existing).startedAt) {
    return { code, ...existing };
  }
  const startedAt = new Date().toISOString();
  const attempts = existing.attempts.map((attempt, index) =>
    index === existing.attempts.length - 1 ? { ...attempt, startedAt } : attempt,
  );
  const updated: CandidateAccess = { ...existing, attempts };
  await backend().set(accessKey(code), updated);
  return { code, ...updated };
}

/** The gate's authority: access is granted only when live (active + unexpired). */
export async function candidateHasAccess(code: string): Promise<boolean> {
  const record = await getCandidate(code);
  return record !== null && displayStatus(record) === "active";
}

function isCandidateAccess(value: unknown): value is CandidateAccess {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.status === "active" || candidate.status === "revoked") &&
    Array.isArray(candidate.attempts) &&
    candidate.attempts.length > 0
  );
}
