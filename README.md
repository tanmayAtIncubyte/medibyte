# MediByte

A deliberately-buggy online-pharmacy web app used to assess QA / dev hiring
candidates. It ships as a polished, working storefront seeded with **50 deliberate
bugs** across functional, accessibility, performance, security (HIPAA/PHI), UI, and
UX categories. Candidates explore the app, find and report defects, and write test
cases; reviewers grade against the answer key.

Two assessment tracks share the same app: a **manual** track (find and report the
defects) and an **automation** track (write a BDD suite against the clean app —
see [`docs/automation-qa/`](docs/automation-qa/)). A candidate's access link is
bound to one track.

> **Reviewers / operators:** see [`docs/ADMIN-RUNBOOK.md`](docs/ADMIN-RUNBOOK.md).
> **Candidates:** see [`docs/CANDIDATE-BRIEF.md`](docs/CANDIDATE-BRIEF.md).
> Do **not** share the runbook or [`docs/ANSWER-KEY.md`](docs/ANSWER-KEY.md) with candidates.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind v4** · **shadcn/ui**
- **No SQL database.** Deterministic seed data in `data/*` served through real
  `app/api/**` routes (so the DevTools Network tab is meaningful). Mutable runtime
  state (cart, orders, stock, accounts) lives behind an async KV seam
  (`lib/data/backend.ts`): in-memory locally, **Upstash Redis** on the deploy.
- **Auth:** hand-rolled signed httpOnly cookie (HMAC-SHA256).
- **Bug engine:** `lib/bug-registry.ts` (the 50-bug answer key) → `data/bug-flags.json`
  → `lib/bugs.ts` `isBugActive(key, user)` — a bug fires only when its flag is on
  **and** the signed-in user's role is `customer`. **Admin and the `qa_automation`
  account (Steve) always see the clean reference app.** Five of the 50 (the Batch-7
  internal-QA defects) are listed in the registry but are not yet wrapped in an
  `isBugActive` branch, so they are always on for everyone — see `lib/bug-registry.ts`.
- **Access gate:** `proxy.ts` → `lib/access/gate.ts`. Enabled only when the Redis env
  is present, so local dev and tests are wide open. Everyone but admin needs a live
  `mb_cand` cookie from a `/start?code=…` link; per-candidate state is isolated under
  a `cand:<code>` scope (`lib/access/scope.ts`).
- **Tests:** Vitest + React Testing Library — 81 files / 1001 tests, of which the
  26 `*.bugs.test.*` files (94 tests) are the guardrail that keeps every seeded bug
  alive. `npm test` runs offline against the in-memory store.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # full suite (offline; in-memory store)
npm run build
```

Local dev needs **no environment variables**: it uses the in-memory store and the
candidate-access gate is disabled (open the app directly).

Seeded logins (local): admin `admin@medibyte.test` / `admin.incu123`;
customers `dana@example.test` / `dana1234`, `omar@example.test` / `omar1234`;
QA automation `steve@example.test` / `steve1234` (clean app, no `/admin` access).

## Deploy

Single Next.js app on Vercel. Set `SESSION_SECRET` and the two `UPSTASH_REDIS_REST_*`
vars (see [`.env.example`](.env.example) and runbook §7). With Redis configured,
per-candidate state persists and reviewers mint time-boxed access links at
`/admin/candidates`. `vercel.json` auto-deploys `dev` and `main` and disables
auto-deploy for `feat/*`.

## Branches

`main` ← `dev` ← `feat/*`. **`dev` is the current line** — it carries the 50-bug
registry, the access gate, the candidate roster, the automation track and the
account delete/validation work. `main` (and therefore the public deploy) still runs
the earlier 45-bug, gate-free build until `dev` is merged into it. The Incubyte
visual redesign lives on `feat/ui-incubyte` and is not on `dev` yet.
