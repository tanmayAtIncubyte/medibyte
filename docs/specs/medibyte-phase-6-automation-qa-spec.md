# Spec: MediByte — Phase 6 (Automation-QA Track: Steve account, locator hardening, tiered assignments)

## Overview
Phases 1–4 built MediByte as a manual bug-hunting assessment tool for admin/dana/omar. Phase 6 adds a parallel track for assessing **automation QA candidates**: a 4th account ("Steve") that sees the app 100% clean (like admin, but without admin-panel access), a deliberately hardened storefront DOM (no `id`/`data-testid`/guessable-string locators, though every element stays fully accessible), 3 flows of increasing automation difficulty reachable from Steve's single login, and 3 tiered candidate-facing assignment briefs (1-3y / 4-6y / 6+y experience) instructing candidates to automate one flow each with BDD + Selenium/Playwright/Cypress.

**Hard constraint:** dana's and omar's existing ~45 seeded bugs (Phase 4) must remain fully intact and untouched — bug-bypass and locator-hardening are orthogonal concerns (behavioral vs structural) and must not interact.

No Linear epic exists for this track yet, so slices below skip the `(MED-xx)` suffix used in Phases 1–4.

---

## Phase Map (this spec only)
- **Slice 1 — Steve account & role architecture:** new `qa_automation` role, seed data, single-choke-point bypass change, session-type fix.
- **Slice 2 — Locator-hardening framework:** remove guessable `id`/`htmlFor` hooks storefront-wide; establish the 3-tier structural-difficulty pattern.
- **Slice 3 — Flow definitions, test-case catalog & seed data:** 3 flows (Discovery & Purchase / Cart & Coupon Management / Account & Order-History Verification) with 3-7 test cases each, written up as a catalog doc; seed data to support them.
- **Slice 4 — Tiered candidate assignment briefs:** 3 new candidate-facing docs (easy/medium/hard), matching `docs/CANDIDATE-BRIEF.md` style.

---

### Slice 1: Steve account & role architecture [x]
Decouples "sees a clean app" from "has admin-panel access" so a non-admin account can bypass bugs without gaining admin privileges.

- [x] `data/users.ts`'s `UserRole` widens to `"admin" | "customer" | "qa_automation"`; a new seed user `steve@example.test` / `steve1234`, role `qa_automation`, is added
- [x] `data/accounts.ts` has a Steve `AccountState` (address + insurance) and `data/orders.ts` has at least one seed order for Steve, so Slice 3's account/order-history flow has real data to display
- [x] `lib/bugs.ts`'s `isBugActiveWith` bypass condition changes from `role === "admin"` to `user && user.role !== "customer"` (the bare `role !== "customer"` form was tried and rejected during verification — it incorrectly bypassed anonymous/logged-out requests too, breaking `SEC_MISSING_ADMIN_AUTH`) — a single choke point covering both admin and `qa_automation`, with zero per-bug rewiring
- [x] `lib/bugs.ts`'s `GatingUser` type imports `UserRole` from `data/users.ts` instead of hand-duplicating the literal union
- [x] `lib/auth/session.ts`'s `isSessionPayload` role allowlist accepts `"qa_automation"` (currently a hard 2-value check — the guaranteed breakage point if left unfixed)
- [x] `lib/orders/order.ts`, `lib/data/orders.ts`, `lib/orders/place-order.ts` import `UserRole` instead of their own hand-duplicated `"admin" | "customer"` literal unions
- [x] `lib/auth/guards.ts` (`requireAdmin`, `getAdminOrNull`) and `app/api/admin/bug-flags/route.ts`'s inline admin check are **unchanged** — both still require `role === "admin"` exactly, so Steve cannot reach `/admin` or `/api/admin/bug-flags`
- [x] Logging in as `dana@example.test`/`omar@example.test` still shows all 45 bugs behaving exactly as before (regression check on the bypass-condition change) — verified via all 26 `.bugs.test.ts(x)` suites (94 tests) passing unchanged
- [x] Logging in as `steve@example.test` shows the app behaving clean/bug-free everywhere admin does, and `/admin` + `/api/admin/bug-flags` reject Steve the same way they reject a customer
- [x] `docs/ADMIN-RUNBOOK.md`'s logins table and "the one rule that matters" section, and `docs/ANSWER-KEY.md`'s header block, mention Steve/`qa_automation` as a second clean-app account alongside admin
- [x] `npm run test` passes (918 passed, 5 pre-existing Redis-backend skips). `npm run lint` still fails on a pre-existing, unrelated error in `components/layout/test-app-tile.tsx` (confirmed present before this slice via `git stash`) — not caused by or fixed in this slice

---

### Slice 2: Locator-hardening framework [x]
Removes guessable, hand-authored `id`s and the `htmlFor`/`id` pairs that expose them, across the storefront pages the 3 flows exercise (home/products/cart/checkout/orders/account). `/login`, `/register`, `/admin` are unchanged. Every element keeps a real, correct accessible name/role — hardening is structural, never at the expense of WCAG.

- [x] `components/products/catalog-toolbar.tsx`'s literal ids (`catalog-search`, `catalog-category`, `catalog-type`, `catalog-sort`) and their `htmlFor` pairs are removed; inputs remain correctly labeled via implicit label-wrapping (the pattern already used in `components/auth/credentials-form.tsx`) or, where an id-based relationship (`aria-describedby`) is structurally required, via React's `useId()` rather than a static readable string
- [x] `components/cart/coupon-form.tsx`'s literal ids (`coupon-code`, `coupon-error`) are removed/replaced the same way, preserving the `aria-describedby` link between the coupon input and its error message
- [x] A documented 3-tier structural-difficulty pattern exists (in the flow catalog from Slice 3, or inline as code comments where applied): Tier 1 = no id/data-testid, unique accessible names only; Tier 2 = duplicate/non-unique accessible names among repeated components (e.g. multiple cart-line "Remove" controls) plus async-appearing state requiring waits; Tier 3 = nested/layered UI (dialog/tab patterns) and positionally-disambiguated elements, still fully accessible — Tier 1 documented inline in both touched files; full Tier 2/3 write-up deferred to Slice 3's flow catalog per this AC's own wording
- [x] Cart-line controls (`components/cart/cart-line-controls.tsx`) demonstrate Tier 2: quantity/remove controls across multiple lines are only disambiguated by scoping to their parent line, not by a global unique id — verified unchanged/pre-existing, already scoped via per-line `aria-label` + `role="group"`, no global id
- [x] shadcn/Radix internals (`data-slot`, `data-variant`, `data-state` in `components/ui/*.tsx`) are left untouched — out of scope, unrelated to the bug-seeding pattern — confirmed via `git diff`, zero changes
- [x] Manual keyboard/screen-reader walkthrough of every touched form confirms no label association was silently broken by the id removal — no e2e/manual-walkthrough tooling exists in this repo; equivalent confidence from Testing Library's accessible-name/role queries (`getByLabelText`, `getByRole(..., { name })`, `toHaveAccessibleName`) in both new test files, which compute the same accessibility tree a screen reader would use
- [x] `npm run test` and `npm run lint` pass — tests: 926 passed / 5 pre-existing Redis skips (all new). Lint: still fails on the same pre-existing, unrelated `components/layout/test-app-tile.tsx` error noted in Slice 1 (confirmed via `git stash -u`, identical failure with none of this slice's changes present) — not caused by or fixed in this slice

---

### Slice 3: Flow definitions, test-case catalog & seed data [ ]
Defines the 3 assignment flows, all reachable from Steve's single login (no self-registration for this track), each mapped to a years-of-experience tier and matching Slice 2's difficulty tiers.

- [ ] A new doc `docs/automation-qa/flows-and-test-cases.md` exists, enumerating:
  - **Flow 1 — Discovery & Purchase (Tier 1 / 1-3y):** log in as Steve → search/filter/sort the product catalog → open a product detail page → add to cart → verify cart contents/total. 3-5 test cases (e.g. search returns matching results, filter narrows results, add-to-cart updates the cart badge, cart total matches line items).
  - **Flow 2 — Cart & Coupon Management (Tier 2 / 4-6y):** from a multi-line cart → adjust quantities and remove a line via duplicate-named controls → apply, replace, and remove a coupon → confirm recalculated totals → submit the checkout shipping/prescription form. 5-7 test cases (duplicate-control scoping, coupon apply/replace/remove, async total recalculation, pending-state submit button).
  - **Flow 3 — Account & Order-History Verification (Tier 3 / 6+y):** update address + insurance on `/account` → place an order (chained from Flow 2's cart) → open the order's detail page from `/orders` → cross-verify shipping/insurance data matches what was entered on `/account` and at checkout. 5-7 test cases (nested/positional disambiguation, cross-page data consistency, list-to-detail navigation).
- [ ] Each flow's test cases are concrete enough to automate (named preconditions, steps, expected result) without referencing internal bug flags, keys, or the runbook
- [ ] Steve's seed data (from Slice 1) is sufficient to complete Flow 3 end-to-end (existing address/insurance to update, existing order history to cross-verify against)
- [ ] Manual walkthrough of all 3 flows as Steve confirms each is completable exactly as written

---

### Slice 4: Tiered candidate assignment briefs [ ]
Three new candidate-facing docs, one per flow/tier, matching `docs/CANDIDATE-BRIEF.md`'s tone and structure.

- [ ] `docs/automation-qa/assignment-easy.md` (1-3y, Flow 1), `docs/automation-qa/assignment-medium.md` (4-6y, Flow 2), `docs/automation-qa/assignment-hard.md` (6+y, Flow 3) each exist
- [ ] Each brief includes: app description, the one assigned flow (described candidate-facing, not by internal flow/tier name), Steve's login credentials, and requirements — BDD required, tool choice free (Selenium/Playwright/Cypress preferred), a test-reporting setup required, and explicit "must run on any machine" setup/run instructions with no machine-specific paths or credentials baked in
- [ ] None of the three briefs reference bug flags, keys, the runbook, or the answer key (matches the existing candidate brief's rule)
- [ ] Each brief's structure (disclaimer, about-the-app, task, test data, submission expectations) mirrors `docs/CANDIDATE-BRIEF.md`'s section order

---

## Out of scope (Phase 6)
- Any reference/sample automation solution code (briefs only, per confirmed decision).
- Hardening `/login`, `/register`, or `/admin` (storefront pages only, per confirmed decision).
- Self-registration for the automation track — Steve is the only automation-track login.
- Removing or altering shadcn/Radix's own `data-slot`/`data-variant`/`data-state` attributes.
- Any change to the existing 45 bugs' behavior, registry entries, or flag defaults.
- Refactoring the pre-existing duplicated admin-check in `app/api/admin/bug-flags/route.ts` (unrelated to this epic).

## Technical Context
- **Stack (locked):** Next.js App Router + TypeScript + TailwindCSS + shadcn/ui. No database — all new seed data is plain TS/JSON under `data/`.
- **Single choke point preserved:** `lib/bug-registry.ts` → `data/bug-flags.json` → `lib/bugs.ts` `isBugActiveWith(flags, key, user)` remains the only bug-gating mechanism; Slice 1 only widens its bypass condition, it does not touch any of the 45 individual call sites.
- **Risk level:** MODERATE. Primary risks: (a) the role-union widening touches several typed call sites (`lib/orders/*`, `lib/data/orders.ts`, `lib/auth/session.ts`) — a missed site fails closed (Steve appears logged out) rather than open, which is the safe failure direction but must be caught by `npm run test`/`npm run build`; (b) locator hardening must not regress accessibility — verified manually per slice, not just by type-checking.
