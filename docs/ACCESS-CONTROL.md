# How time-boxed candidate access works

> Design/reference doc for the reviewer. For the step-by-step operational
> instructions (mint a link, revoke, extend), see `docs/ADMIN-RUNBOOK.md` §2.
> For deploy/env setup, see runbook §7.

## The core idea

Everything hinges on **one Redis key per candidate**: `cand:<code>`. That single
key is simultaneously:

- the **access token** — if it exists, access is allowed;
- the **clock** — it carries a native TTL, so when the window lapses the key
  vanishes on its own; and
- the **namespace root** for all that candidate's data (`cand:<code>:cart`,
  `:orders`, `:stock`, `:reg:*`, `:accounts:*`).

So "your access," "your countdown," and "your data" are literally the same thing.
When the window ends, all three disappear together — no cron job, no cleanup
script.

## The lifecycle

**1. Mint** (`/admin/candidates`, admin-only)
You enter a name + window (default 10 days). The app generates a random code
(8 hex chars from a UUID) and writes:

```
SET cand:<code>  {name, email, role?, notes?, createdAt, expiresAt, startedAt?}  EX <windowDays × 86400>
```

`EX` is Redis's native expiry. `email` is required (the reviewer's unique
identifier for the candidate); `role`/`notes` are optional metadata; `startedAt`
is unset at mint and stamped on the first `/start` (see below). The code is the
only thing the candidate needs. (Code: `lib/access/candidates.ts` →
`mintCandidate`.)

**2. Hand off** — copy the link `https://…/start?code=<code>` and send it to the
candidate.

**3. Enter** (`/start?code=…`, `app/start/route.ts`)
- Looks up `cand:<code>`. If it's gone/invalid → redirect to `/closed`.
- If live → **stamps `startedAt`** on the first open (`markStarted`, first-open
  wins, remaining TTL preserved) — this is the "assignment started" timestamp
  shown in the reviewer console.
- Sets an **httpOnly cookie** `mb_cand=<code>`, with the cookie's own `maxAge`
  set to the exact seconds left until `expiresAt` (so the browser drops it in
  lockstep with the Redis key).
- Redirects to `/login` to register / sign in.

**4. Every request passes through the gate** (`proxy.ts`, runs before any page or
API; decision logic is the pure `gateDecision()` in `lib/access/gate.ts`):

```
if no Redis configured            → pass    (local dev / demos: gate off)
if path is /login, /start, /closed, /api/auth/*, /api/health → pass  (allowlist)
if valid admin session            → pass    (reviewers never need a code)
if mb_cand cookie present AND cand:<code> still exists in Redis → pass
otherwise                         → /closed  (403 JSON for /api/*)
```

The key line is the last real check: the cookie only carries the code; **the
authority is whether `cand:<code>` still exists in Redis** on that request.

**5. Their data is isolated + co-expiring.** Once they have the cookie,
`currentScope()` (`lib/access/scope.ts`) reads it and every store operation is
namespaced under `cand:<code>:…` with the same TTL. So two candidates never see
each other's cart/stock (important for the oversell / double-spend bugs), and
everything they create inherits the window's expiry.

## How access ends (three ways, all the same mechanism)

| Event | What happens | Effect |
|---|---|---|
| **Window lapses** | Redis auto-deletes `cand:<code>` (native TTL) | Next request → gate finds no key → `/closed`. Cart/orders/etc. expire too. |
| **Revoke** (button) | `DEL cand:<code>` | **Instant** lockout on their very next click. |
| **Extend +10d** | Re-`SET` the key with a new, longer TTL | Window lengthens; nothing else changes. |

There's no scheduled job watching the clock — expiry *is* the absence of the key,
which Redis handles itself.

## Why it's built this way

- **It also fixes the serverless problem.** On Vercel each request can hit a
  different stateless function, so in-memory carts vanished (add-to-cart returned
  201 but the cart read back empty). The same Redis that stores the access key
  stores their cart — so persistence and time-boxing are solved by one piece of
  infrastructure.
- **Local dev is unaffected.** With no Redis env, the gate is off and stores are
  in-memory — the app opens directly, no link, so demos and tests stay
  frictionless.

## Security properties

- The code is an unguessable random value; a stale/forged code fails because the
  gate checks it **exists in Redis**, not just that it's well-formed.
- The cookie is `httpOnly` (JS can't read it) and `secure` in production.
- Admins bypass via their signed session — they never need a code.
- Revocation is immediate because it's checked live on every request, not baked
  into a self-contained token.

## Where it lives (code map)

| Concern | File |
|---|---|
| Access registry (mint / get / list / revoke / extend) | `lib/access/candidates.ts` |
| Request scope + cookie name + TTL | `lib/access/scope.ts` |
| Gate decision (pure, unit-tested) | `lib/access/gate.ts` |
| Gate adapter (runs per request) | `proxy.ts` |
| Candidate entry point | `app/start/route.ts` |
| Locked-out page | `app/closed/page.tsx` |
| Reviewer UI | `app/admin/candidates/page.tsx`, `components/admin/candidate-manager.tsx` |
| Reviewer API | `app/api/admin/candidates/route.ts` (+ `[code]/route.ts`) |
| KV seam (in-memory local / Upstash Redis on deploy) | `lib/data/backend.ts`, `lib/data/backend-redis.ts` |
| Deployment health/config probe | `app/api/health/route.ts` |

---

*In one line: a candidate's code is a self-expiring Redis key that gates their
access and owns their data.*
