// Candidate access registry over the KV seam.
//
// A reviewer mints a code; the record lives at `cand:<code>` with a NATIVE TTL
// — the key's existence IS the access authority. When the TTL lapses the key
// (and, elegantly, every piece of candidate state namespaced under the same
// `cand:<code>:` prefix — see lib/access/scope.ts) self-destructs; DEL is
// instant revocation. Note the identity: the access key equals the candidate's
// state-namespace prefix, so "your access" and "your world" expire together.
//
// These keys are GLOBAL (no scope prefix): the registry is reviewer-facing
// bookkeeping, not per-candidate state.

import {
  DEFAULT_CANDIDATE_WINDOW_DAYS,
  parseCandidateCode,
} from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";

export type CandidateAccess = {
  name: string;
  email: string;
  role?: string;
  notes?: string;
  createdAt: string;
  expiresAt: string;
  // Stamped the first time the candidate opens their /start link — the moment
  // the assignment actually began. Undefined until then ("not started").
  startedAt?: string;
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
// never surface in the registry listing.
const ACCESS_KEY_SHAPE = /^cand:[a-z0-9-]+$/;

const DAY_MS = 86_400_000;

function accessKey(code: string): string {
  return `cand:${code}`;
}

/**
 * Mint a new time-boxed candidate code. The code is 8 lowercase hex chars (the
 * head of a UUID), which satisfies parseCandidateCode's slug shape. Input is
 * assumed already validated at the route boundary; `startedAt` begins unset.
 */
export async function mintCandidate(
  input: MintCandidateInput,
): Promise<CandidateRecord> {
  const { name, email, role, notes } = input;
  const windowDays = input.windowDays ?? DEFAULT_CANDIDATE_WINDOW_DAYS;
  const code = crypto.randomUUID().slice(0, 8).toLowerCase();
  const now = new Date();
  const access: CandidateAccess = {
    name,
    email,
    ...(role ? { role } : {}),
    ...(notes ? { notes } : {}),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + windowDays * DAY_MS).toISOString(),
  };
  await backend().set(accessKey(code), access, windowDays * 86_400);
  return { code, ...access };
}

/**
 * Stamp `startedAt` the first time a candidate opens their /start link. First
 * open wins — a second open is a no-op. The re-save preserves the REMAINING
 * TTL (computed from expiresAt) so marking-started never extends the window.
 */
export async function markStarted(
  code: string,
): Promise<CandidateAccess | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  if (existing.startedAt) {
    return existing;
  }
  const updated: CandidateAccess = {
    ...existing,
    startedAt: new Date().toISOString(),
  };
  const ttlSeconds = Math.max(
    1,
    Math.floor((Date.parse(existing.expiresAt) - Date.now()) / 1000),
  );
  await backend().set(accessKey(code), updated, ttlSeconds);
  return updated;
}

/** The live access record for a code, or null (expired, revoked, malformed). */
export async function getCandidate(
  code: string,
): Promise<CandidateAccess | null> {
  const parsed = parseCandidateCode(code);
  if (!parsed) {
    return null;
  }
  const value = await backend().get<CandidateAccess>(accessKey(parsed));
  return isCandidateAccess(value) ? value : null;
}

/** All live candidates. Filters out candidate STATE keys under the same prefix. */
export async function listCandidates(): Promise<CandidateRecord[]> {
  const keys = await backend().listKeys("cand:");
  const records = await Promise.all(
    keys
      .filter((key) => ACCESS_KEY_SHAPE.test(key))
      .map(async (key) => {
        const value = await backend().get<CandidateAccess>(key);
        return isCandidateAccess(value)
          ? { code: key.slice("cand:".length), ...value }
          : null;
      }),
  );
  return records
    .filter((record): record is CandidateRecord => record !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Revoke immediately: DEL the key — the candidate is locked out on their next request. */
export async function revokeCandidate(code: string): Promise<void> {
  const parsed = parseCandidateCode(code);
  if (!parsed) {
    return;
  }
  await backend().del(accessKey(parsed));
}

/**
 * Extend a live window: new expiresAt = max(now, old expiresAt) + extraDays,
 * TTL re-set to match. Returns the updated record, or null for an unknown
 * (expired/revoked) code — extension never resurrects dead access.
 */
export async function extendCandidate(
  code: string,
  extraDays: number,
): Promise<CandidateAccess | null> {
  const existing = await getCandidate(code);
  if (!existing) {
    return null;
  }
  const nowMs = Date.now();
  const baseMs = Math.max(nowMs, Date.parse(existing.expiresAt));
  const expiresAt = new Date(baseMs + extraDays * DAY_MS).toISOString();
  const updated: CandidateAccess = { ...existing, expiresAt };
  const ttlSeconds = Math.ceil((Date.parse(expiresAt) - nowMs) / 1000);
  await backend().set(accessKey(code), updated, ttlSeconds);
  return updated;
}

function isCandidateAccess(value: unknown): value is CandidateAccess {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.expiresAt === "string"
  );
}
