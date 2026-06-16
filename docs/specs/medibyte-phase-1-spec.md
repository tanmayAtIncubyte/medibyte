# Spec: MediByte — Phase 1 (Foundation, Bug-Toggle Infrastructure, Auth & Admin Panel)

## Overview
MediByte is a deliberately-buggy online pharmacy web app used to assess QA/dev hiring candidates: admins see a clean reference app + a bug-control panel, customers see seeded bugs (toggleable per assessment). Phase 1 builds the clean foundation — the app scaffold, a mock-data layer served through real API route handlers, the bug-toggle infrastructure everything else hangs off, lightweight cookie auth with admin/customer roles, and the admin bug-flag control panel. **No bugs are seeded in Phase 1** — only the infrastructure that makes seeding possible, and a believable, defect-free baseline.

---

## Phase Map (full arc — Phase 1 detailed below; later phases are headlines only)

- **Phase 1 — Foundation & toggle infra (THIS SPEC):** Next.js App Router + TypeScript + Tailwind + shadcn/ui scaffold; deterministic mock-data modules served via real API route handlers; in-memory per-session write store; bug-toggle infrastructure (`lib/bug-registry.ts`, `data/bug-flags.json`, `lib/bugs.ts` `isBugActive`); signed-cookie auth with admin/customer roles; admin bug-flag control panel. No seeded bugs.
- **Phase 2 — Catalog, cart & coupons:** product list (search/filter/sort/paginate), product detail (OTC vs Rx), cart (add/remove/update qty, live totals), coupon codes (valid/expired).
- **Phase 3 — Checkout, orders & account:** checkout with shipping (PII) + prescription/health (PHI) flow + mock payment + place order; order history & detail; account (profile, addresses, insurance).
- **Phase 4 — Seed the ~45 bugs:** all six categories × four difficulty tiers wired through `isBugActive`, plus the two special bugs (reading tripwire, chained bug).
- **Phase 5 — Our tests & ship:** Vitest unit + toggle-proves-bug tests, axe-core a11y on clean build, Playwright happy paths; candidate brief, answer key, bug-report template, README; deployment.

---

## Phase 1 Slices (ordered, each independently shippable)

Ordering is outside-in within slices, but slices themselves follow a dependency order: the running app shell first, then the data-over-API pattern, then the toggle engine (the core idea — everything hangs off it), then auth/roles, then the admin panel that drives the toggles. Each slice leaves the app runnable and shippable.

---

### Slice 1: App scaffold & running shell [x]
The walking skeleton: a Next.js app you can run and load, with the design system wired in.

- [x] Running `npm run dev` starts the app and the home page loads in a browser with no console errors
- [x] The home page renders branded MediByte content (name/logo/tagline), not the framework default starter page
- [x] Tailwind utility classes applied in a component visibly affect rendered styling
- [x] At least one shadcn/ui component (e.g. Button) renders and is interactive on a page
- [x] A shared app layout (header with MediByte branding + a page container) wraps every route
- [x] Navigating to an unknown route shows a styled 404/not-found page, not an unstyled crash
- [x] `npm run build` completes without TypeScript or build errors

---

### Slice 2: Mock-data layer served via real API route handlers
Establishes the canonical "deterministic mock data, real HTTP, in-memory writes" pattern that every later feature copies. Phase 1 only needs a small representative dataset and one or two read endpoints to prove the pattern; full catalog/orders data arrives in later phases.

- [ ] A client page can fetch data and the request appears as a real HTTP call in the browser DevTools Network tab (genuine request/response, not an inlined import)
- [ ] At least one read endpoint (e.g. `GET /api/products`) returns deterministic seed data as JSON with a 200 status
- [ ] Requesting the same read endpoint twice returns identical data (no runtime randomness)
- [ ] Seed data lives in plain TypeScript/JSON modules under `data/` with no database, migrations, or runtime RNG
- [ ] An endpoint for a non-existent resource id returns a 404 with a JSON body (not a 200, not an HTML error page)
- [ ] A write performed in a session (e.g. a stub add-to-cart or session value) is readable back within the same session
- [ ] In-memory session writes reset to the seed baseline after the server restarts
- [ ] Seed data includes at least: a small set of products and the user accounts needed for auth (1 admin + at least 1 customer)

---

### Slice 3: Bug-toggle infrastructure (the core idea)
The registry, the flag file, and `isBugActive` — built before any feature so every later feature gates its buggy path through one helper. No real bugs yet; verified with a throwaway test/probe key.

- [ ] `lib/bug-registry.ts` exports a canonical list where each entry has at minimum: `key`, `title`, `category`, `difficulty`, `location`, and `hipaa` (boolean)
- [ ] Every registry `key` is unique
- [ ] `data/bug-flags.json` exists and contains an enabled/disabled state for every key in the registry
- [ ] If `bug-flags.json` is missing or is missing a key present in the registry, the system seeds/defaults that key to disabled rather than crashing
- [ ] `lib/bugs.ts` exports `isBugActive(key, user)` returning `true` only when the flag is enabled AND the user is not an admin
- [ ] `isBugActive` returns `false` for an admin user even when the flag is enabled
- [ ] `isBugActive` returns `false` for any user (including customer) when the flag is disabled
- [ ] `isBugActive` returns `false` for an unauthenticated/no-user request (default to correct behavior)
- [ ] `isBugActive` called with a key not in the registry returns `false` (and does not throw)
- [ ] The intended code pattern is documented and demonstrated once: correct path is the default, buggy path is the gated branch (`isBugActive(key, user) ? buggy() : correct()`)

---

### Slice 4: Lightweight cookie auth with admin/customer roles
Custom signed-cookie session keyed off the seed users, exposing the current user (with role) that `isBugActive` and the admin panel depend on.

- [ ] A visitor can log in from `/login` using credentials that match a seed user
- [ ] Logging in with valid admin credentials starts an admin session; with valid customer credentials starts a customer session
- [ ] Logging in with unknown or wrong credentials shows an error and does not start a session
- [ ] A logged-in user's role (admin vs customer) is readable by server code (route handlers / server components) for the duration of the session
- [ ] The session is carried in a signed, httpOnly cookie (not readable via client JavaScript / `document.cookie`)
- [ ] Tampering with the session cookie value invalidates the session (treated as logged out) rather than impersonating a user
- [ ] A user can log out, after which protected/admin routes are no longer accessible as that user
- [ ] Visiting `/admin` (or admin API) while logged out, or while logged in as a customer, is denied (redirect to login or 403) — admin areas require an admin session
- [ ] The header reflects auth state (shows who is logged in and a logout action when authenticated; a login link when not)
- [ ] Registration via `/register` exists and, on success, creates a customer-role session (registration writes are in-memory per session, consistent with the data layer)

---

### Slice 5: Admin bug-flag control panel
The admin-only screen that lists every registry bug and writes toggles to `bug-flags.json`, closing the loop so toggles take effect for customers.

- [ ] An admin visiting `/admin` sees a bug-control panel listing every bug from the registry
- [ ] Each listed bug shows its title, category, and difficulty, and a current on/off state
- [ ] The panel's displayed on/off state for each bug matches the value in `data/bug-flags.json`
- [ ] An admin can toggle an individual bug on or off from the panel
- [ ] Toggling a bug writes the new state to `data/bug-flags.json` and the change persists across a page reload
- [ ] The change persists across a server restart (the flag file, not in-memory state, is the source of truth)
- [ ] After a flag is toggled, a subsequent `isBugActive(key, customer)` call reflects the new state (the panel actually drives behavior)
- [ ] A non-admin (customer or logged-out) cannot view the panel and cannot toggle flags via the toggle API (request is denied)
- [ ] The panel can filter or group bugs by category and/or difficulty so a reviewer can configure an assessment quickly
- [ ] A "reset to defaults" or bulk all-off action exists so the reviewer can return to a known clean baseline

---

## API Shape (indicative — Phase 1)

```
GET  /api/products            -> 200 [{ id, name, price, type: 'OTC'|'Rx', ... }]   (deterministic)
GET  /api/products/[id]       -> 200 { ... } | 404 { error }
POST /api/auth/login          -> 200 (sets signed httpOnly session cookie) | 401 { error }
POST /api/auth/register       -> 201 (sets customer session) | 409 { error }
POST /api/auth/logout         -> 204 (clears cookie)
GET  /api/admin/bug-flags     -> 200 { [key]: boolean }     (admin only, else 403)
POST /api/admin/bug-flags     -> 200 (writes data/bug-flags.json) (admin only, else 403)
```

```ts
// lib/bugs.ts — the gating contract
export function isBugActive(key: BugKey, user: SessionUser | null): boolean
// true only when flags[key] === true AND user?.role !== 'admin'

// usage pattern (correct path default, buggy path gated)
const total = isBugActive('CART_TAX_ROUNDING', user) ? buggyTax(x) : correctTax(x)
```

---

## Out of Scope (Phase 1)
- Any seeded/active bugs — Phase 1 ships a clean baseline plus dormant infrastructure only (no entries in the registry need real buggy code paths yet; a throwaway probe key may be used to verify the engine, then removed or left disabled).
- Catalog browse/search/filter/sort/paginate UI and product detail (Phase 2).
- Cart, coupons, checkout, orders, account screens (Phases 2–3).
- The full ~100 products / ~50 customers / ~300 orders dataset — Phase 1 needs only enough seed data to prove the patterns and support auth.
- Answer key, candidate brief, bug-report template, README, and our own test suite (Phases 4–5).
- Real payments, real PHI, and persistent multi-user backend (out of scope for the whole product).
- Production deployment / persistent-filesystem flag storage (decided in Phase 5).

---

## Technical Context
- **Stack (locked):** Next.js App Router + TypeScript + TailwindCSS + shadcn/ui. No database.
- **Patterns to follow / establish:**
  - Deterministic mock data in `data/*.ts` served through real `app/api/**/route.ts` handlers (so DevTools Network shows genuine traffic). This pattern is established in Slice 2 and reused by every later feature.
  - In-memory per-session write store for cart/order/registration writes (resets on restart).
  - Single source of truth for bugs: `lib/bug-registry.ts` → `data/bug-flags.json` → `lib/bugs.ts` `isBugActive(key, user)`. Correct path is always the default; buggy path is the gated branch.
  - Custom signed-cookie session for auth (avoids NextAuth; chosen because it is intentionally easy to inject auth bugs into later phases).
- **Key dependencies / integration points:** every later feature depends on Slice 3 (toggle infra) and Slice 4 (auth/role) being in place; the admin panel (Slice 5) is the runtime control surface for assessments.
- **Risk level:** MODERATE. Primary risks: (a) the toggle engine must be correct and admin-safe — a leak here corrupts every assessment; (b) cookie auth is hand-rolled, so signing/tamper-resistance must be sound; (c) flag-file persistence semantics (write + survive reload/restart) must be reliable.

---

## Assumptions / Open Questions
(Synthesized defaults — recorded here for the developer to confirm. No developer interview was possible in this run.)

1. **Seed credentials / login mechanism.** Assumed username-or-email + password matched against seed users, with passwords stored as plain values in the seed module (acceptable: no real data, assessment-only). Open: do you want a fixed admin login (e.g. `admin@medibyte.test`) documented for reviewers?
2. **Password handling.** Assumed plaintext comparison against seed data for simplicity, since security *bugs* are deliberate and live behind the toggle infra in Phase 4 — Phase 1 auth itself should be clean. Confirm this is acceptable for the clean baseline.
3. **Probe/demonstration of the toggle engine.** Assumed Phase 1 uses a single throwaway/no-op probe key to prove `isBugActive` end-to-end (toggle in panel → behavior changes for customer), since there are no real bugs yet. Confirm whether you want this probe kept (disabled) or removed before Phase 2.
4. **`bug-flags.json` location & git status.** Assumed committed with all-disabled defaults and writable at runtime in local dev. Open: should it be git-ignored (treated as per-deployment local state) or committed as the clean baseline?
5. **Admin route protection scope.** Assumed both `/admin` pages and `/api/admin/*` handlers are independently guarded (defense in depth). Confirm you don't want the *missing admin-auth* security bug accidentally pre-built here — Phase 1 must be clean; that bug is a Phase 4 toggle.
6. **shadcn/ui scope in Phase 1.** Assumed we install shadcn and pull in only the handful of primitives Phase 1 needs (Button, Input, Table/Card, Switch/Toggle, form bits). Confirm we don't need a fuller component set provisioned up front.
7. **Branding/visual identity.** No `.claude/DESIGN.md` exists. Assumed a clean, believable pharmacy look defined ad hoc in Phase 1; a design brief could be produced before Phase 2's storefront. Open: do you want a design pass before catalog UI?
8. **Reset-to-defaults behavior (Slice 5).** Assumed "reset" means set all flags to disabled (clean baseline). Confirm vs. resetting to some preset assessment profile.
```