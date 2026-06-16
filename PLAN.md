# Plan: "MediByte" — A Deliberately-Buggy Pharmacy Store for QA/Dev Candidate Assessment

## Context

**Problem with the original assessments.** The two briefs in `References/` (a salary-management build assessment and a test-craftsperson assessment) produce weak signal: candidates submit generic, AI-generated test cases that all look the same. There's no way to tell who can actually *find* problems.

**The new idea.** Flip it. We (the hiring team) build one genuinely good web app, then deliberately seed it with bugs across multiple **categories** (functional, accessibility, performance/latency, security/transport, UI-antipattern, UX) and **difficulty** tiers (easy → expert). We ship the buggy app to candidates, and the assessment becomes: *find the bugs, report them, and write test cases that catch them.* This measures real testing/debugging skill instead of prompt-copying.

**Domain (decided with user).** An **online pharmacy store**. On the surface it's pure e-commerce (browse → cart → coupon → checkout → orders), so any candidate understands it with zero sector knowledge. Underneath, prescription products carry **health data (PHI)**, which creates a legitimate **HIPAA/privacy** surface for the security-category bugs ("a customer can see another customer's prescription" is obviously wrong to anyone, *and* a textbook HIPAA violation for senior candidates to name).

**Locked decisions.**
- Stack: **Next.js (App Router) + TypeScript + TailwindCSS + shadcn/ui**. **No database.**
- Data layer: **fixed mock data (JSON/TS modules) served through real Next.js API route handlers.** This keeps infra maintenance-free *and* produces genuine network traffic candidates can inspect in the DevTools Network tab (gap-5). Writes (cart/orders) are held **in-memory per session**.
- Bug versioning: **role-based + JSON-file feature flags**. Admin = clean reference app (the live answer key) + a bug-control panel. Customer = buggy behavior when a bug's flag is enabled. Flags persist in a flat JSON file, toggled at runtime from the admin panel.
- Performance/latency bugs are **simulated** (artificial delays + request patterns injected in the mock API routes), not real load problems.
- Keep the **security/privacy tier**; framed as generic web security in-app, labelled HIPAA/PHI in the private answer key.
- Candidate submission: an **Excel/Sheet template** they fill (Bug | Steps | Expected | Actual | Severity | Test case) and return; we skim it against the private answer key. No grading platform — manual review. (Matches the original assessment docs' Excel deliverable.)

## Architecture

### The bug-toggle mechanism (the core idea — get this right first)
- **`lib/bug-registry.ts`** — the canonical list of every bug: `{ key, title, category, difficulty, route/file location, hipaa: boolean }`. Single source of truth; seeds the flag file. It *is* the answer key.
- **`data/bug-flags.json`** — `{ [key]: enabled }`, seeded from the registry, written by the admin panel, persists across restarts. No DB engine.
- **`lib/bugs.ts`** — `isBugActive(key, user)` returns `true` only when the flag is enabled **and** the user is not an admin. Admins always get correct behavior.
- **Code pattern** — the correct path is the default; the buggy path is gated:
  ```ts
  const total = isBugActive('CART_TAX_ROUNDING', user) ? buggyTax(x) : correctTax(x)
  ```
  Adding/removing a bug = one registry entry + one conditional. No parallel clean/buggy branches to keep in sync.

### Data layer (no DB — mock data + real API routes)
- **`data/*.ts`** — fixed, deterministic seed data: products (OTC + Rx), users (1 admin + several customers), orders with prescriptions/insurance, coupons. Plain modules, no migrations, no RNG at runtime.
- **`app/api/**/route.ts`** — real HTTP route handlers that read the mock data and return it. This is where API-shaped bugs live: wrong status codes, over-fetching PHI, missing auth, injected latency. Behaves like a real API so the bugs are realistic and Network-tab-discoverable.
- **In-memory session store** for cart/order writes (resets on restart — fine for an assessment).
- Lightweight signed-cookie session for auth (custom — easy to inject auth bugs into; avoids NextAuth complexity).

### Scope: screens, features & where bugs live (no real payments — mock checkout)

| Area | Route(s) | Features | Bug categories it feeds |
|------|----------|----------|-------------------------|
| Auth + roles | `/login`, `/register` | Login/register; Admin (clean) + Customer (buggy) | security (auth/access), UX |
| Catalog | `/products`, `/products/[id]` | List, search, filter, sort, paginate; detail w/ OTC vs Rx badge | functional, accessibility, performance, UI-antipattern |
| Cart | `/cart` | Add/remove/update qty, live totals | functional, UX, UI-antipattern |
| Discounts | (cart/checkout) | Coupon codes, expiry | functional, security (client tamper) |
| Checkout | `/checkout` | Address (PII), Rx → health info (PHI), mock payment, place order | functional, accessibility, security, UX |
| Orders | `/orders`, `/orders/[id]` | History + order detail (PHI) | **security (IDOR / PHI leak)**, performance |
| Account | `/account` | Profile, saved addresses, insurance | **security (PII/PHI leak)** |
| Admin panel | `/admin` | Dashboard, all-orders/users view, **bug-flag toggles** | security (missing auth) |

### Mock data set
~100 products (OTC + prescription mix), 1 admin + ~50 customers, ~300 orders with prescriptions/insurance, several coupons (valid + expired). All static/deterministic so behavior and tests are reproducible. Enough rows to exercise pagination and surface (simulated) latency.

## Bug catalog — two axes: **category** × **difficulty** (~45 bugs)

Every bug is classified on two axes: a **category** (what kind of defect it is) and a **difficulty** tag (how hard it is to find/diagnose — easy/moderate/difficult/expert). The table below is the at-a-glance distribution; the detailed lists that follow are representative, and the full set with repro steps lives in the answer key.

| Category | Count | Difficulty notes |
|------------------------------|-------|----------------------------------------------|
| Functional | 22 | Easy 8 / Moderate 6 / Difficult 5 / Expert 3 |
| Accessibility | 3 | a11y: alt text, labels, keyboard/focus |
| Performance / Latency | 5 | all simulated (injected delays / patterns) |
| Security / Transport (MITM) | 6 | HIPAA-tagged where PHI is involved |
| UI antipattern | 4 | discoverable by inspection of the UI |
| UX | 5 | confusing flows / poor feedback |
| **Total** | **45** | each bug independently toggleable |

Representative lists; the full set with repro steps lives in the answer key. Every bug carries a difficulty tag (easy/moderate/difficult/expert) regardless of category.

### Functional (22) — Easy 8 / Moderate 6 / Difficult 5 / Expert 3
- **Easy (8):** price formatting (separators/decimals); price sort sorts as string; pagination off-by-one; cart badge counts lines not quantity; missing empty-state on no-results; sale price higher than struck-through original; "Rx" badge on OTC items; "in stock" copy when stock is 0.
- **Moderate (6):** quantity accepts 0/negative/huge; cart total not recomputed after qty change; tax rounding (floor vs round); expired coupon still applies; out-of-stock item still addable; required checkout field unvalidated.
- **Difficult (5):** inventory oversell (no atomic decrement → race); coupon stacking → negative total; filter lost on pagination; pagination count uses unfiltered set; order status allows invalid transition (cancel after delivered).
- **Expert (3):** race in concurrent checkout double-spends stock; coupon + tax + rounding interaction yields wrong total only at specific values; partial-failure mid-checkout leaves inconsistent state.

### Accessibility (3)
Missing alt text on product images; form inputs without associated `<label>`; not keyboard-operable / no visible focus ring (add-to-cart unreachable via Tab).

### Performance / Latency (5) — all simulated
Product-list endpoint artificially slow with no loading spinner; request waterfall (one request per list item) visible in Network tab; search fires a request per keystroke (no debounce); entire catalog fetched then filtered client-side (over-fetch); layout shift (CLS) as late data arrives.

### Security / Transport — incl. man-in-the-middle (6) — HIPAA-tagged where PHI
Login posts credentials in URL query string (GET → visible in network/history/logs); PHI over-returned in API response; IDOR on `/api/orders/[id]` (no ownership check → see another customer's prescription); session token in `localStorage` (XSS-exfiltratable) vs httpOnly cookie; missing auth check on admin API; price/coupon trusted from client (tamperable in request).

### UI antipattern (4)
Destructive action (delete address / cancel order) with no confirmation; no feedback after submit; form clears all fields on one validation error; misleading icon (trash icon that edits).

### UX (5)
Unhelpful error messages ("Something went wrong", no next step); no clear order-confirmation/success state; multi-step checkout loses progress on back; price shown without tax until final step (surprise cost); validation only on submit, not inline.

**Target totals:** Functional 22, Accessibility 3, Performance/Latency 5, Security/Transport 6, UI-antipattern 4, UX 5 = **45 bugs**, each independently toggleable.

### Difficulty calibration & natural hiding (design principles)
- **Tier by the easiest path that surfaces the bug:** Easy = visible on the happy path (eyeballs); Moderate = needs a deliberate edge input/action; Difficult = needs combining steps/state or spotting cross-screen inconsistency; Expert = needs tools (DevTools/Network) or a security/concurrency mindset. A bug is only correctly tiered if it **cannot** be found by an easier method — e.g. an "expert" Network-tab leak must not also throw a visible UI error (that would make it easy).
- **Bugs must hide naturally.** The clean (admin) build must look and feel like a real, polished pharmacy product — believable branding, product content, and data — so seeded bugs blend into normal-looking features instead of standing out as obviously planted. Realism is a feature requirement, not polish-for-its-own-sake.
- **No scoring/grading mechanism.** The reviewer reads the submitted Excel template and makes the hire call by judgment. The plan deliberately includes no rubric engine, scoreboard, or auto-detection.

### Two special bugs (borrowed patterns, counted within the 45 — not extra)
- **Reading tripwire (Qxf2 pattern), 1 bug — Functional, Easy/Moderate:** a contradiction planted in *content/copy* that only an attentive tester catches — e.g. "Ships in 24h" on an item shown as backordered, or a product claim that contradicts its detail page. Cheap to add, and a strong filter against skim-testing and AI-paste submissions. Occupies one existing Functional slot.
- **Chained bug (Juice Shop pattern), 1 bug — Expert:** finding bug A reveals bug B (e.g. the IDOR on `/orders/[id]` exposes another customer's order id, which is then reused to pull their PHI from an over-permissive endpoint). Creates an expert-only discovery path. Occupies one existing Expert/Security slot. Optional — drop if build time is tight.

## Artifacts to produce
- **`docs/requirements.md`** — one-page product/scope doc (per the original brief's spirit, adapted to the assessment-platform).
- **`docs/ANSWER-KEY.md`** — private: every bug with key, category, difficulty, location, repro steps, expected vs actual, HIPAA tag, and (where relevant) "how to spot it" (e.g. via Network tab). Git-ignored or kept in a private path.
- **`docs/CANDIDATE-BRIEF.md`** — what the candidate receives (no answers): app overview + task (find/report bugs, write test cases), and a hint that bugs span functional/a11y/perf/security/UI/UX and that the Network tab is fair game.
- **`docs/bug-report-template.xlsx`** — the submission template handed to candidates: columns Bug | Steps to reproduce | Expected | Actual | Severity | Test case. Returned filled-in; reviewed manually against the answer key.
- **`README.md`** — setup/run instructions for us.

## Our own tests (the clean app must be provably correct)
- **Vitest** unit tests on pure logic (pricing/cart/coupon/tax) and the access-control helpers — assert the **correct** (admin) behavior.
- Tests that flip a flag and assert the **buggy** behavior appears for customers — proves each toggle works and the bug is isolated.
- **axe-core** accessibility assertion on key pages for the **clean** build (so we know the a11y bugs are injected, not accidental).
- 1–2 **Playwright** e2e happy-path flows (browse → cart → checkout → order). Fast, deterministic (static data).

## Build order (incremental commits)
1. Scaffold Next.js + Tailwind/shadcn; mock data modules + API route handlers; in-memory session store.
2. Bug-toggle infrastructure: registry, `bug-flags.json`, `isBugActive`, admin flag panel (build early so every feature can hang bugs off it).
3. Auth + roles.
4. Catalog (list/search/filter/sort/paginate/detail) + its functional/a11y/perf/UI bugs.
5. Cart + coupons + their functional/UX bugs.
6. Checkout (+ PHI flow) + orders + account.
7. Security/transport + remaining performance/latency + UX + UI-antipattern bugs across the app.
8. Answer key + requirements + candidate brief docs.
9. Tests (unit + toggle + axe + e2e).
10. Deployment.

## Known consideration: deployment
No DB makes deploy easy. Caveat: the `bug-flags.json` write from the admin panel won't persist on a serverless/read-only filesystem (Vercel). Two options: (a) deploy on a persistent host (**Render/Railway**) so admin toggles stick, or (b) on Vercel, fix the flag set at build time per candidate deployment and treat live toggling as a local-dev convenience. Decide at step 10.

## Git workflow
No repo yet. `git init`, create `main` + `dev`, and do all work on `feat/*` branches per the global workflow, with incremental commits showing evolution (the original brief explicitly values this).

## Verification
1. `npm run dev`; log in as **admin** → walk every screen, confirm correct behavior (this is the reference). axe shows no a11y violations.
2. Log in as **customer** → confirm seeded bugs are observable, including: a Network-tab bug (e.g. PHI over-fetch), a latency bug (slow endpoint, no spinner), an a11y bug (Tab can't reach add-to-cart), a UI-antipattern (delete with no confirm), a UX bug (unhelpful error).
3. In `/admin` bug panel, toggle a bug off → customer behavior becomes correct; toggle on → bug returns; confirm the change persisted to `bug-flags.json`.
4. `npm test` (Vitest) green: correct-behavior + toggle-proves-bug tests.
5. `npm run test:e2e` (Playwright) happy paths green.
6. Spot-check 2–3 security bugs manually (e.g., IDOR: log in as customer A, open customer B's `/orders/[id]`; inspect login request to confirm credentials-in-URL bug).
