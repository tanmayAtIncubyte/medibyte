# MediByte

A deliberately-buggy online-pharmacy web app used to assess QA / dev hiring
candidates. It ships as a polished, working storefront seeded with **45 deliberate
bugs** across functional, accessibility, performance, security (HIPAA/PHI), UI, and
UX categories. Candidates explore the app, find and report defects, and write test
cases; reviewers grade against the answer key.

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
- **Bug engine:** `lib/bug-registry.ts` (the 45-bug answer key) → `data/bug-flags.json`
  → `isBugActive(key, user)` — a bug fires only when its flag is on **and** the user
  is not an admin. **Admins always see the clean reference app.**
- **Tests:** Vitest + React Testing Library.

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
customers `dana@example.test` / `dana1234`, `omar@example.test` / `omar1234`.

## Deploy

Single Next.js app on Vercel. Set `SESSION_SECRET` and the two `UPSTASH_REDIS_REST_*`
vars (see [`.env.example`](.env.example) and runbook §7). With Redis configured,
per-candidate state persists and reviewers mint time-boxed access links at
`/admin/candidates`.
