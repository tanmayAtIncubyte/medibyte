# How time-boxed candidate access works

> Design/reference doc for the reviewer. For the step-by-step operational
> instructions (mint a link, revoke, re-grant, extend, remove), see
> `docs/ADMIN-RUNBOOK.md` §2. For deploy/env setup, see runbook §7.

## The core idea

Access hinges on **one persistent Redis record per candidate**: `cand:<code>`.
It is a **roster entry**, not an ephemeral token — it has **no TTL** and does not
vanish on its own. Access is a **computed check** over that record, not the
presence or absence of a key:

> A candidate has access iff `status === "active"` **AND** `now < currentAttempt.expiresAt`.

- **`status`** is `"active"` or `"revoked"`. `"expired"` is *derived* from the
  clock (never stored).
- **The clock** is the current attempt's `expiresAt`. When it lapses, the record
  **remains** — the candidate simply reads as *expired* and can be re-granted.
- The code is still the **namespace root** for all that candidate's data
  (`cand:<code>:cart`, `:orders`, `:stock`, `:reg:*`, `:accounts:*`). Those
  heavy **state** keys carry a **generous fixed TTL** (`CANDIDATE_STATE_TTL_DAYS
  = 60`, see `lib/access/scope.ts`) purely as an auto-cleanup safety net —
  **decoupled** from the access window so short/fractional windows never delete a
  candidate's work mid-assessment.

So the roster record governs *whether* access is allowed; the state TTL is just
housekeeping; and **Remove** is the only thing that actually deletes anything.

### Attempts (grant / return history)

Every **grant** — the initial mint *and* each **re-grant** — pushes a new
`Attempt` onto the record. A returning candidate is "Attempt 2", "Attempt 3", and
so on. Each attempt carries its own window and timestamps:

```
Attempt = { attempt, grantedAt, windowDays, expiresAt, startedAt?, revokedAt? }
```

`startedAt` is stamped on the first `/start` of **that** attempt; `revokedAt` is
stamped if the attempt is revoked. The **current attempt** (the last one) is what
`expiresAt`/gating read.

### Fractional windows

Windows are **fractional days**: `0.5` = 12h, `0.25` = 6h, etc. They are typed on
mint and again on re-grant/extend, so you can hand out a short window and top it
up as needed.

## The lifecycle

**1. Mint** (`/admin/candidates`, admin-only)
You enter a name + email + window (default 10 days; fractional allowed). The app
generates a random code (8 hex chars from a UUID) and writes a **persistent**
record (**no TTL**):

```
SET cand:<code>  {
  name, email, role?, notes?,
  createdAt,
  status: "active",
  attempts: [{ attempt: 1, grantedAt, windowDays, expiresAt }]
}
```

`email` is **required** (the reviewer's unique identifier for the candidate) and
**duplicate emails are blocked at mint** (409) — re-grant or remove the existing
entry instead. `role`/`notes` are optional reviewer-only metadata. The code is the
only thing the candidate needs. (Code: `lib/access/candidates.ts` →
`mintCandidate`.)

**2. Hand off** — copy the link `https://…/start?code=<code>` and send it to the
candidate.

**3. Enter** (`/start?code=…`, `app/start/route.ts`)
- Checks access via `candidateHasAccess(code)`. If the candidate isn't live
  (missing / revoked / expired) → redirect to `/closed`.
- If live → **stamps the current attempt's `startedAt`** on the first open of that
  attempt (`markStarted`, first-open wins) — the "assignment started" timestamp
  shown in the reviewer console.
- Sets an **httpOnly cookie** `mb_cand=<code>` (the cookie only carries the code;
  the record in Redis is the authority).
- Redirects to `/login` to register / sign in.

**4. Every request passes through the gate** (`proxy.ts`, runs before any page or
API):

```
if no Redis configured            → pass    (local dev / demos: gate off)
if path is /login, /start, /closed, /api/auth/*, /api/health → pass  (allowlist)
if valid admin session            → pass    (reviewers never need a code)
if mb_cand cookie present AND candidateHasAccess(code) is true → pass
otherwise                         → /closed  (403 JSON for /api/*)
```

The key line is the last real check: the cookie only carries the code; **the
authority is `candidateHasAccess(code)`** — active **and** unexpired — evaluated
live on that request.

**5. Their data is isolated.** Once they have the cookie, `currentScope()`
(`lib/access/scope.ts`) reads it and every store operation is namespaced under
`cand:<code>:…` with the state TTL. So two candidates never see each other's
cart/stock (important for the oversell / double-spend bugs). That state TTL is a
safety-net auto-cleanup, **not** the access clock — access is governed by the
persistent record.

## How access ends / changes

| Event | Mechanism | Effect |
|---|---|---|
| **Window lapses** | Nothing stored — `displayStatus` computes **expired** once `now ≥ currentAttempt.expiresAt` | Next request → gate denies → `/closed`. **Record REMAINS** and is re-grantable; state survives (state TTL). |
| **Revoke** | `revokeCandidate` flips `status → "revoked"` + stamps the current attempt's `revokedAt` | **Instant** lockout on their next request. **Reversible** — record stays, re-grantable. |
| **Re-grant** | `regrantCandidate` pushes a **new attempt** (fresh, typed, fractional-ok window) + sets `status → "active"` | Candidate is live again as "Attempt N". Keeps prior state → they **resume** their cart/orders if still within the state TTL. |
| **Extend** | `extendCandidate` pushes the **current attempt's** `expiresAt` out by the extra days (from max(now, current expiry)) | Window lengthens; nothing else changes. |
| **Remove** | `removeCandidate` **deletes** the record AND purges all `cand:<code>:*` state keys | Hard delete; **frees the email** for reuse. The only true cleanup. |

There's no scheduled job watching the clock — expiry is a *computed* state, and
the state-key TTL is Redis's own auto-eviction safety net.

## Why it's built this way

- **A roster, not a self-destructing token.** Keeping the record lets you see a
  candidate's full history (attempts, when they started, when a window lapsed) and
  bring them back with a fresh window without re-typing their details — while
  revoke stays instant and reversible.
- **It also fixes the serverless problem.** On Vercel each request can hit a
  different stateless function, so in-memory carts vanished (add-to-cart returned
  201 but the cart read back empty). The same Redis that stores the access record
  stores their cart — so persistence and access are solved by one piece of
  infrastructure.
- **Local dev is unaffected.** With no Redis env, the gate is off and stores are
  in-memory — the app opens directly, no link, so demos and tests stay
  frictionless.

## Security properties

- The code is an unguessable random value; a stale/forged code fails because the
  gate calls `candidateHasAccess()`, not just a well-formedness check.
- The cookie is `httpOnly` (JS can't read it) and `secure` in production.
- Admins bypass via their signed session — they never need a code.
- Revocation is immediate because access is checked live on every request, not
  baked into a self-contained token.
- Duplicate emails are rejected at mint, so one candidate can't hold two live
  roster entries.

## Where it lives (code map)

| Concern | File / symbol |
|---|---|
| Access registry (mint / get / list / find-by-email) | `lib/access/candidates.ts` → `mintCandidate`, `getCandidate`, `listCandidates`, `findCandidateByEmail` |
| Lifecycle transitions | `revokeCandidate` (soft), `regrantCandidate`, `extendCandidate`, `removeCandidate` (hard delete + purge), `markStarted` |
| Access authority + helpers | `candidateHasAccess`, `currentAttempt`, `effectiveExpiresAt`, `displayStatus` |
| Request scope + cookie name + state TTL | `lib/access/scope.ts` (`CANDIDATE_STATE_TTL_DAYS`) |
| Gate adapter (runs per request) | `proxy.ts` |
| Candidate entry point | `app/start/route.ts` |
| Locked-out page | `app/closed/page.tsx` |
| Reviewer UI | `app/admin/candidates/page.tsx`, `components/admin/candidate-manager.tsx` |
| Reviewer API | `app/api/admin/candidates/route.ts` (+ `[code]/route.ts`) |
| KV seam (in-memory local / Upstash Redis on deploy) | `lib/data/backend.ts`, `lib/data/backend-redis.ts` |
| Deployment health/config probe | `app/api/health/route.ts` |

---

*In one line: a candidate's code is a persistent roster record whose `status` +
current-attempt expiry govern access; heavy state carries a safety-net TTL; and
**Remove** is the only thing that deletes.*
