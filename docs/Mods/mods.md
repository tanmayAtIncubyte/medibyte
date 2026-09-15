# Mods

## Automation logins

> ## ✅ Shipped — but not exactly as planned. Read this first (2026-09-15).
>
> This plan was built via PR #1 `feat/automation-qa-track` (merged to `dev`) and then
> **revised** by `feat/automation-tracks`. What's actually in the code:
>
> | Planned here | Shipped |
> |---|---|
> | Role named `automation` | Role named **`qa_automation`** (`data/users.ts`, `UserRole`) |
> | A pool of 3–5 accounts | **One** account — **Steve**, `steve@example.test` / `steve1234` |
> | Password `automation.incu123` | `steve1234` (plain seed password; the admin rotation path is still `role === "admin"`-only, as predicted) |
> | Widen `isBugActive` so bugs are inert | **Done** — `isBugActiveWith` returns false for any authenticated non-`customer`, so admin and `qa_automation` both see the clean app |
> | Admin surfaces stay admin-only | **Done, no change needed** — `requireAdmin` still checks `role !== "admin"`, and the header only shows Admin/Candidates to admins |
> | Generalise the gate to `isPrivileged` = admin ∥ automation | **Built, then REVERTED.** `feat/steve-gate` added the bypass; `feat/automation-tracks` removed it |
>
> **The bypass was the wrong shape.** Letting the role past the gate meant anyone who
> learned Steve's credentials had an ungated door into the deployed app. It was
> replaced by **track-bound candidate links**: the roster record carries
> `track: "manual" | "automation"` (`lib/access/candidates.ts`), and
> `app/api/auth/login/route.ts` compares that track against the authenticated role on
> every sign-in — a manual link signs in **only** as dana/omar, an automation link
> **only** as Steve, mismatch → **403**; admin exempt. So Steve is now an ordinary
> gated account and an automation candidate needs a live automation `/start` link,
> exactly like a manual candidate. Only admin passes the gate with no code.
>
> **The parallel-run collision the plan worried about is solved differently too.**
> Because every candidate's state is namespaced under `cand:<code>`, two automation
> candidates sharing the Steve login never collide — the link, not the account, is the
> isolation boundary. That is why one account was enough and the pool was dropped.
>
> **Docs:** `docs/ADMIN-RUNBOOK.md` §2 (logins + tracks), `docs/ACCESS-CONTROL.md`
> (track binding), `docs/automation-qa/` (the track's flows and candidate briefs).
> As predicted, `docs/CANDIDATE-BRIEF.md` needed no change — the automation track has
> its own briefs.
>
> The original plan is kept below unchanged, for the reasoning.

### Request
Generate **automation logins** that see everything working with **no bugs**, similar
to how **admin** works — but **without** admin functionality (no bug reference / bug
images, no candidate-code generation, no candidate management, no bug-flags API).

### Purpose (why)
Give the team a stable account for **their own** Cypress/Playwright regression suites
to run against the clean reference behavior, without (a) tripping over the seeded
bugs the way a `customer` login does, or (b) handing the test runner admin powers over
candidate access. It is a **third role** that sits between admin and customer:
- **Sees the clean app** (bugs inert) — like admin.
- **Is not an admin** — denied every `/admin*` surface — like a customer.

> Note: this does **not** change the "no test-ids by design" decision. Automation
> logins give a bug-free *target*; selector strategy is unchanged. Candidate brief is
> untouched — this is internal only.

---

### Design

Add a new role `automation` to the role union. Exactly one behavioral lever decides
"sees clean app," and it already exists: `isBugActive`. Everything else is either
unchanged (admin guards already exclude non-admins) or a small allow-list add (the
access gate).

**The rule of thumb:**
- *"Sees clean app?"* → **admin OR automation** (widen `isBugActive`).
- *"Has admin powers?"* → **admin only** (guards already enforce this — no change).
- *"Bypasses the candidate access gate?"* → **admin OR automation** (widen the gate).

### Touch points (grounded in current code)

1. **Role type + seed accounts — `data/users.ts`**
   - `UserRole = "admin" | "customer"` → add `"automation"`.
   - Add seed automation account(s), e.g. `automation@medibyte.test`. Password: a
     fixed seed constant (e.g. `automation.incu123`) — **not** the rotatable admin
     key (`resolveAdminPassword` is `role === "admin"`-only, so automation falls
     through to the plain seed password with no change to `lib/auth/accounts.ts`).
   - **Decision — how many:** app state (cart/orders/stock/account) is namespaced by
     user id, so parallel test runs sharing ONE automation account would collide.
     Options: (a) a small **pool** `automation1..automationN@medibyte.test` (simplest;
     each parallel worker uses a distinct one), or (b) one account + accept serialized
     runs. Recommend a pool of 3–5.

2. **Session validation — `lib/auth/session.ts` (~line 74)**
   - The payload validator currently accepts `role === "admin" || "customer"`. Add
     `"automation"` or the automation session cookie will be rejected as invalid.

3. **Clean-app behavior — `lib/bugs.ts` (the one real lever)**
   - `GatingUser = { role: "admin" | "customer" } | null` → widen to include
     `"automation"`.
   - `isBugActiveWith`: today `if (user?.role === "admin") return false`. Change to a
     helper `seesCleanApp(role) = role === "admin" || role === "automation"` and
     return `false` (bug inert) when it's true. This single change makes **every**
     seeded bug inert for automation everywhere `isBugActive` is consulted (prices,
     search/pagination, tax, coupons, checkout, a11y, perf, security, UI/UX).

4. **Admin surfaces stay admin-only — NO CHANGE (verify)**
   - `lib/auth/guards.ts` `requireAdmin` / `getAdminOrNull` check `role !== "admin"`
     → automation is already denied `/admin`, `/admin/candidates`, and all
     `/api/admin/*`. Leave as-is.
   - `components/layout/site-header.tsx` shows Admin/Candidates nav only when
     `role === "admin"` → automation won't see them. Leave as-is.
   - `SEC_MISSING_ADMIN_AUTH` (`/api/admin/bug-flags`): the guard-drop is gated by
     `isBugActive("SEC_MISSING_ADMIN_AUTH", user)`, which is now inert for automation
     → automation gets a proper **403** (secure), consistent with "no bugs." **Verify**
     the route resolves the flag against the current user (it should).

5. **Access gate — `proxy.ts` + `lib/access/gate.ts`**
   - The gate lets admins pass and otherwise requires a live candidate cookie. An
     automation session has no candidate code, so today it would be sent to `/closed`.
   - `gateDecision` takes an `isAdmin` boolean (see `lib/access/gate.test.ts`).
     Generalize it to a **`isPrivileged`** (or `bypassGate`) input = `admin ||
     automation`, and have `proxy.ts` compute it from the resolved session role.
     Admin-route *authorization* still lives in the page/API guards, so letting
     automation past the gate does not grant it admin pages.

### Tests
- `lib/bugs` — a representative bug (e.g. `FN_PRICE_DECIMALS`) is **inert** for an
  `automation` user, exactly like admin; still active for `customer`.
- `lib/access/gate.test.ts` — an automation/privileged session **passes** every path
  (incl. `/api/*`) with no candidate cookie.
- `lib/auth/guards.test.ts` — automation is **denied** `requireAdmin` (redirect) and
  `getAdminOrNull` (null → 403).
- `lib/auth/accounts.test.ts` — automation authenticates with its seed password; the
  admin-password override does not apply to it.
- `lib/auth/session.ts` — an automation payload round-trips as valid.

### Docs
- `docs/ADMIN-RUNBOOK.md`: document the automation login(s) — purpose, credentials,
  "sees the clean app, no admin powers," and the parallel-run/account-pool note.
- `docs/CANDIDATE-BRIEF.md`: **no change** (internal only; never shown to candidates).

### Verification (browser, as an automation user)
- Prices show two decimals; `?q=ibuprofen` returns the product (no off-by-one);
  tax computed on the post-discount base; expired coupon rejected — i.e. seeded bugs
  are gone. Header shows **no** Admin/Candidates links. `/admin` and
  `/admin/candidates` redirect; `/api/admin/bug-flags` returns 403. No candidate
  cookie needed to browse.
- `npm test` green + `npm run build` clean.

### Open decisions (need a call before building)
1. **Account pool size** — one automation account, or a pool of 3–5 for parallel runs?
2. **Role name** — `automation` (assumed) vs `e2e` / `tester`.
3. **Password** — fixed seed `automation.incu123` (recommended) vs rotatable.
4. **Gate param rename** — generalize `isAdmin` → `isPrivileged` (cleaner) vs a minimal
   include that keeps the name.

### Branch / workflow
`feat/automation-logins` off `dev`; commit + push; **do not merge** until tested
(per the standing rule). Additive only — no seeded-bug branch or flag is modified;
the clean baseline for admin and customer is unchanged.

*(As shipped: `feat/automation-qa-track` → PR #1 → `dev`, then `feat/steve-gate` and
`feat/automation-tracks`. The additive-only constraint held — all 26 `*.bugs.test.*`
suites / 94 tests passed unchanged throughout.)*
