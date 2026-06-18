# Brainstorm: Redis persistence + time-boxed candidate access

## Problem
Run real MediByte assessments on the Vercel deploy: cart/checkout must persist
(it doesn't on serverless), and each candidate needs the app for ~10 days then
auto-locked out — with a fix that's simple, light, and easy to maintain.

## Key context (verified this session)
- No DB today: cart/orders/coupons live in an **in-memory per-session store**;
  bug flags in `data/bug-flags.json` (baked all-45-on because Vercel's FS is read-only).
- **Proven serverless break:** in-memory cart does NOT persist on Vercel — each request
  hits a different stateless lambda, so Add-to-cart returns `201` but the cart stays empty.
  Every cart/checkout bug is therefore dead on the deploy.
- Vercel **password protection is not on Hobby** (Pro/Enterprise only); Hobby protects
  only preview URLs, production stays public. Free-tier gating = Next.js middleware.
- Auth is a custom **signed-cookie session** (`SESSION_SECRET`) — crypto we can reuse.

## Options Explored
1. **Upstash Redis + per-candidate namespace + TTL** — server-side store; everything keyed
   `cand:<code>:*` with a 10-day TTL. Effort: medium. Risk: low. **(Chosen.)**
2. **Cookie-based cart (no infra)** — move cart into the signed cookie, no server store.
   Effort: low. Risk: medium — wildcard; works for cart but newly-placed *orders* can't grow
   in a 4KB cookie, so order-flow bugs stay broken. Rejected.
3. **Vercel native password protection** — not available on Hobby. Rejected.
4. **Signed magic-link, no DB** — `sign({candidateId, exp}, SESSION_SECRET)`, middleware
   verifies. Effort: low. Risk: medium — no early revoke, no list/extend. Rejected vs Redis.
5. **Account-expiry field** — pre-create logins with `accessExpiresAt`. Effort: low.
   Risk: low-medium — drops the current self-register flow. Rejected.
6. **Manual ops (pause/delete the Vercel project)** — zero code but all-or-nothing, not
   per-candidate, and doesn't fix cart. Rejected.

## Chosen Direction
**Introduce Upstash Redis (direct free tier, not Vercel KV) behind a thin `Store` interface,
and make the candidate's access key the same TTL that owns all their state.**

- **`Store` interface, two impls:** in-memory (local dev + Vitest, offline/fast — preserves
  the local demo flow) and Redis (the deploy). Env-detected: `UPSTASH_REDIS_REST_URL` present
  → Redis, else in-memory.
- **Per-candidate namespace, one TTL:**
  ```
  cand:<code>          -> { name, createdAt }   EX 864000   ← the access key
  cand:<code>:cart     -> {...}                 (same TTL)
  cand:<code>:orders   -> [...]                 (same TTL)
  cand:<code>:stock    -> {...}                 (isolated per candidate)
  ```
- **Access gate (Next.js middleware):** `/admin/candidates` mints a code →
  `redis.set('cand:'+code, {...}, {ex: 864000})`. Candidate opens `/start?code=…` (sets a
  signed cookie); middleware checks `cand:<code>` exists → if gone, "Assessment closed."
  - Auto-expire: TTL. Revoke early: `DEL`. Extend: re-set TTL. List active: `SCAN cand:*`.
- **Scope now:** cart + orders (+ stock) persisted per candidate. **Bug flags are out of
  scope entirely.**

### Bug-flag system: explicitly unchanged (user decision)
- **All 45 flags stay ON and global** (baked `data/bug-flags.json`) — every candidate faces
  the full set. No per-candidate flag profiles.
- **The flag code stays as-is** — `lib/bug-registry.ts`, `isBugActive` gating, and every bug
  code path are untouched. Flags do NOT move into Redis.
- **No toggle UI** — the `/admin` bug-flag panel is unused in the assessment deploy (and can't
  toggle on Vercel's read-only FS anyway). Optional cleanup: delete the panel *component*
  (`components/admin/bug-flag-panel.tsx`) to avoid confusion.
- **Keep the `/api/admin/bug-flags` endpoint code** — the `SEC_MISSING_ADMIN_AUTH` bug *is*
  that endpoint missing its guard, so the route must remain even though the panel UI is gone.

## Key Insights
- **One infra, two problems.** The Redis needed to fix serverless cart persistence *also*
  solves time-boxed access for free via native key TTL — no cron, no cleanup job.
- **Namespacing by candidate unifies three concerns:** access window, state isolation, and
  auto-cleanup all become the same `cand:<code>:*` + TTL mechanism. The candidate's entire
  world self-destructs on day 10.
- **The `Store` interface keeps it light:** local dev and tests never need Redis, so the
  local demo flow (the way we present) and Vitest stay offline and fast.
- Redis would also let bug flags persist (retire the read-only-FS "bake all 45 on" hack) —
  the door to per-candidate flag profiles.

## Open Questions
- ~~Per-candidate bug-flag profiles~~ — **decided OUT.** All 45 flags stay ON/global, flag
  code unchanged, no toggle UI. Redis touches cart/orders/stock only.
- **Stock ledger:** confirmed per-candidate namespace (isolated) so candidates don't affect
  each other's oversell/double-spend repros.
- **code→cookie handoff:** `/start?code=…` landing sets a signed cookie, then middleware
  checks Redis each request (avoid hitting Redis on every asset).
- **Self-register flow:** keep it, but only reachable *after* passing the candidate gate.
- **Upstash direct vs Vercel KV:** recommend Upstash direct (cheaper per command); both fine
  on the free tier.
