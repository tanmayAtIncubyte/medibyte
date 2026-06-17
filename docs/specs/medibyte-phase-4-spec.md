# Spec: MediByte — Phase 4 (Seed the ~45 bugs)

## Overview
Phase 4 seeds ~45 deliberate bugs onto the now-clean baseline (Phases 1–3 + hardening shipped to `dev`). Each bug is a toggleable defect: **admin always sees correct behavior; a customer sees the buggy behavior only when the bug's flag is enabled.** The bug registry is the live answer key.

Linear: parent **MED-9**. Built in **6 category batches** (MED-23–28) with a checkpoint between each. A focused agent builds a batch; the orchestrator independently verifies each toggle (admin=clean vs customer=buggy) in-browser and maintains the private answer key (`docs/ANSWER-KEY.md`).

## The mechanic (every bug follows this)
1. Add an entry to `lib/bug-registry.ts`: `{ key, title, category, difficulty, location, hipaa }` (unique key). Add the key to `data/bug-flags.json` defaulting to `false`.
2. Gate the buggy path: `const x = isBugActive('KEY', user) ? buggy() : correct();` — **correct path is the default**; admin never sees the buggy branch (enforced by `isBugActive`).
3. Add a test proving the toggle: with the flag off → correct for everyone; with the flag on → buggy for a customer, still correct for admin.
4. Add a private answer-key entry: repro steps, expected vs actual, how a candidate would spot it (incl. which tool), HIPAA tag.
5. Browser-verify: enable the flag in `/admin`, confirm a customer sees the bug and admin does not; disable → correct.

Constraints: keep all existing tests green; never expose the registry/answer key to the client bundle; bugs default OFF so the reviewer enables a chosen set per assessment.

## Batches
- **MED-23 — Batch 1: Functional (Easy + Moderate), 14**
- **MED-24 — Batch 2: Functional (Difficult + Expert), 8** — resolve the stock-behavior decision here (see note).
- **MED-25 — Batch 3: Accessibility, 3**
- **MED-26 — Batch 4: Performance / Latency, 5** (simulated)
- **MED-27 — Batch 5: Security / Transport (HIPAA), 6** — includes the chained bug
- **MED-28 — Batch 6: UI antipattern (4) + UX (5), 9**

## Bug catalog
(Keys, locations, and buggy behavior. The reading tripwire ⭐ and chained bugs 🔗 are folded in.)

### Functional — Easy (8)
- `FN_PRICE_DECIMALS` — `lib/format.ts` — prices drop to 1 decimal / no rounding.
- `FN_PRICE_SORT_LEXICAL` — `lib/catalog/query.ts` — price sort compares as strings.
- `FN_PAGINATION_OFFBYONE` — `lib/catalog/query.ts` — page boundary skips/dupes one item.
- `FN_CART_BADGE_LINES` — header/`cart-service` — badge counts line items, not total qty.
- `FN_INSTOCK_AT_ZERO` — product card/detail — "In stock" shown when stock = 0.
- `FN_NORESULTS_BLANK` — `/products` — no "no results" message on empty search.
- `FN_ORDER_DATE_RAW` — `/orders` — raw/inconsistent date format.
- `FN_TRIPWIRE_COPY` ⭐ — product detail copy — description contradicts the Rx/OTC badge (reading tripwire).

### Functional — Moderate (6)
- `FN_QTY_NONPOSITIVE` — cart controls / `setCartItemQuantity` — accepts 0/negative qty.
- `FN_CART_TOTAL_STALE` — `/cart` — total not recomputed after qty change.
- `FN_TAX_FLOOR` — `lib/cart/totals.ts` — tax floored, not rounded.
- `FN_EXPIRED_COUPON_OK` — `lib/coupons/coupon.ts` — expired coupon still applies.
- `FN_OOS_ADDABLE` — add-to-cart/api — out-of-stock item still addable.
- `FN_POSTAL_UNVALIDATED` — `validateShipping` — one required shipping field skips validation.

### Functional — Difficult (5)
- `FN_TAX_BEFORE_DISCOUNT` — `lib/cart/totals.ts` — tax on pre-discount subtotal (overcharge).
- `FN_COUPON_NEGATIVE` — totals/coupon — discount not clamped → negative total.
- `FN_FILTER_LOST_ON_PAGE` — `catalog-pagination` — changing page drops active filter/search.
- `FN_PAGE_COUNT_UNFILTERED` — `lib/catalog/query.ts` — page count uses unfiltered total.
- `FN_OVERSELL` † — checkout/place-order — no stock check → order qty > stock.

### Functional — Expert (3)
- `FN_CONCURRENT_DOUBLESPEND` † — place-order — race double-spends stock.
- `FN_TOTAL_ROUNDING_EDGE` — totals/coupon — wrong total only at specific coupon+tax values.
- `FN_PARTIAL_CHECKOUT` — place-order — order created but cart not cleared (inconsistent state).

### Accessibility (3)
- `A11Y_INPUT_NO_LABEL` — a form input — loses associated `<label>`.
- `A11Y_LOW_CONTRAST` — token/className — key text/badge below contrast threshold.
- `A11Y_NO_KEYBOARD_FOCUS` — qty stepper / add-to-cart — not keyboard-operable / no focus ring.

### Performance / Latency (5, simulated)
- `PERF_SLOW_CHECKOUT` — `/api/checkout` — injected ~2s latency, no pending feedback.
- `PERF_PRODUCTS_TTFB` — products page — artificial server delay, no loading skeleton.
- `PERF_CART_WATERFALL` — `/cart` — N+1: one request per line item.
- `PERF_OVERFETCH_PAYLOAD` — `/api/products` — returns extra fields the page doesn't need.
- `PERF_NO_CACHE` — navigation — refetches everything on every nav.

### Security / Transport (6, HIPAA-tagged)
- `SEC_IDOR_ORDER` 🔗 — `/orders/[id]` + api — ownership check dropped (see another customer's order). HIPAA.
- `SEC_PHI_OVERFETCH` 🔗 — orders/account API — response includes PHI not needed. HIPAA. (Chain: IDOR leaks an order id → reuse against this.)
- `SEC_MISSING_ADMIN_AUTH` — `/api/admin/bug-flags` — admin guard removed.
- `SEC_CREDS_IN_URL` — login — credentials sent via GET query string.
- `SEC_TOKEN_LOCALSTORAGE` — client auth — identity copied to `localStorage`.
- `SEC_PRICE_TAMPER` — `/api/checkout` — trusts client-supplied price instead of recomputing.

### UI antipattern (4)
- `UI_DESTRUCTIVE_NO_CONFIRM` — cart remove / delete address — instant destructive, no confirm.
- `UI_NO_SUBMIT_FEEDBACK` — a form — submit gives no visible feedback.
- `UI_MISLEADING_ICON` — a button — icon doesn't match action.
- `UI_FORM_CLEARS_ON_ERROR` — checkout — validation error wipes entered fields.

### UX (5)
- `UX_VAGUE_ERROR` — a catch handler — "Something went wrong", no next step.
- `UX_NO_ORDER_CONFIRM` — order confirmation — no clear success cue.
- `UX_SURPRISE_TAX` — cart vs checkout — tax hidden until final step.
- `UX_LOST_CHECKOUT_PROGRESS` — checkout — back navigation loses entered data.
- `UX_NO_PAGE_TOTAL` — `catalog-pagination` — no indication of total pages/results.

## Open decisions
- **† Stock-dependent bugs (`FN_OVERSELL`, `FN_CONCURRENT_DOUBLESPEND`):** the correct baseline (stock decrement + oversell prevention) does NOT exist yet. **Decision deferred to Batch 2** — either add the correct behavior first (then toggle it off) or swap these two for other functional bugs.
- **Performance bugs vs SSR:** redefined to live on real client-fetch/API paths + injected server delays (the classic per-keystroke search bug doesn't fit our server-rendered catalog).

## Out of scope (Phase 4)
- Candidate brief, bug-report template, deployment (Phase 5).
- Changing the bug-toggle infra or auth/access baseline beyond adding gated buggy branches.
