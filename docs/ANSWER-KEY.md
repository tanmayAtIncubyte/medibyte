# MediByte — Private Answer Key (Phase 4 seeded bugs)

> ⚠️ **PRIVATE — reviewer only.** Never share with candidates. Lists every seeded bug, how to trigger it, and the expected-vs-actual behavior. This is server-side/internal only — it is not part of any candidate-facing build. The canonical source is `lib/bug-registry.ts`; this doc adds repro detail.

All bugs default **OFF** (`data/bug-flags.json`). The reviewer enables a chosen set per assessment from `/admin` (admin login: `admin@medibyte.test` / `admin1234`). **Admin always sees correct behavior**; bugs only manifest for customer logins (`dana@example.test` / `dana1234`, `omar@example.test` / `omar1234`).

Entry format:
```
### <KEY> — <title>
- Category / Difficulty / HIPAA
- Location: <file/route>
- Trigger: <steps to reproduce as a customer>
- Expected (correct / admin): <...>
- Actual (buggy / customer, flag on): <...>
- How to spot it: <eyeball | edge input | cross-screen | DevTools Network/Application | a11y tool>
```

---

_Entries are appended per batch as bugs are built (Batches MED-23 → MED-28)._

<!-- BATCH 1: Functional Easy + Moderate -->

### FN_PRICE_DECIMALS — Prices render with one decimal / no cent rounding
- Functional / Easy / HIPAA: no
- Location: `lib/format.ts` (`formatPrice`), resolved at `/products` page + `/products/[id]` page; applied to the product card price and the product-detail price.
- Trigger: As a customer, open `/products` (or any product detail). Look at a price ending in cents, e.g. Naproxen $10.49.
- Expected (correct / admin): `$10.49` — two decimals.
- Actual (buggy / customer): `$10.5` — one decimal, no rounding (`toFixed(1)`).
- How to spot it: eyeball the price strings on the catalog grid / detail page.

### FN_PRICE_SORT_LEXICAL — Price sort compares prices as strings
- Functional / Easy / HIPAA: no
- Location: `lib/catalog/query.ts` (`sortProducts`), resolved at `/products` page.
- Trigger: As a customer, go to `/products`, choose sort "Price: Low to High" (or High to Low).
- Expected (correct / admin): numeric order (e.g. $3.99 before $10.49 before $100…).
- Actual (buggy / customer): lexical/string order — "$10.x" sorts before "$3.x" because "1" < "3" as a character.
- How to spot it: eyeball the ordering of prices after sorting; e.g. a $10 item appears before a $9 item.

### FN_PAGINATION_OFFBYONE — Pagination window skips one item at the boundary
- Functional / Easy / HIPAA: no
- Location: `lib/catalog/query.ts` (`queryCatalog` page start), resolved at `/products` page (page size 9).
- Trigger: As a customer, browse `/products` across pages.
- Expected (correct / admin): page 1 starts at the first product; pages tile the catalog with no gaps.
- Actual (buggy / customer): the window start is shifted by +1, so the very first product is dropped and each page boundary skips one item.
- How to spot it: cross-screen — the first product on page 1 is missing; "Showing N of M" count vs. the items shown disagree.

### FN_CART_BADGE_LINES — Header cart badge counts line items, not total quantity
- Functional / Easy / HIPAA: no
- Location: `components/layout/site-header.tsx` (flag resolved in the header server component).
- Trigger: As a customer, add 3 of the same product (qty 3, one line) to the cart; look at the header cart badge.
- Expected (correct / admin): badge shows 3 (total quantity).
- Actual (buggy / customer): badge shows 1 (number of distinct lines). Add a 2nd different product → badge shows 2 instead of 4.
- How to spot it: cross-screen — header badge vs. the cart page's "Subtotal (N items)" disagree.

### FN_INSTOCK_AT_ZERO — Shows "In stock" when stock is zero
- Functional / Easy / HIPAA: no
- Location: `lib/format.ts` (`stockLabel`), resolved at `/products` (catalog card) + `/products/[id]`.
- Trigger: As a customer, view the 0-stock product "Daily Fiber Supplement Powder" (`prod-fiber-supplement`).
- Expected (correct / admin): "Out of stock" (in destructive/red styling).
- Actual (buggy / customer): "In stock" (styled as available).
- How to spot it: eyeball the availability pill on a known out-of-stock item; cross-check with the disabled Add-to-cart on detail.

### FN_NORESULTS_BLANK — No "no results" message on an empty search
- Functional / Easy / HIPAA: no
- Location: `app/(storefront)/products/page.tsx` (flag resolved in the page).
- Trigger: As a customer, search `/products` for a term that matches nothing (e.g. "zzzzz").
- Expected (correct / admin): the "Nothing here yet / Try a different search term" empty-state panel.
- Actual (buggy / customer): the panel is suppressed — a blank area below the "No products match your search." status line, no guidance or "Clear filters" link.
- How to spot it: eyeball — empty results render nothing helpful.

### FN_ORDER_DATE_RAW — Order date shown as a raw ISO timestamp
- Functional / Easy / HIPAA: no
- Location: `app/(storefront)/orders/page.tsx` (`formatOrderDate`), flag resolved in the page.
- Trigger: As a customer, open `/orders`.
- Expected (correct / admin): friendly date, e.g. "Jan 15, 2026".
- Actual (buggy / customer): raw ISO string, e.g. "2026-01-15T09:30:00.000Z".
- How to spot it: eyeball the order list date.

### FN_TRIPWIRE_COPY — Product detail copy contradicts the Rx/OTC badge (reading tripwire)
- Functional / Easy / HIPAA: no
- Location: `app/(storefront)/products/[id]/page.tsx` (flag resolved in the page).
- Trigger: As a customer, open any product detail page and read the description area.
- Expected (correct / admin): no contradictory line; the Rx/OTC badge and the "Prescription required" note are consistent.
- Actual (buggy / customer): an extra sentence contradicts the badge — Rx products claim "No prescription needed — available over the counter for everyone."; OTC products claim "Prescription required: a pharmacist must verify your prescription before this item ships."
- How to spot it: careful reading — the copy directly contradicts the badge/Rx note above it.

### FN_QTY_NONPOSITIVE — Cart quantity stepper accepts zero / negative quantities
- Functional / Moderate / HIPAA: no
- Location: `app/api/session/cart/route.ts` (PATCH; flag resolved from the signed session cookie).
- Trigger: As a customer with an item in the cart, use the "−" stepper to drop the quantity to 0 (or PATCH `/api/session/cart` with `quantity: 0`).
- Expected (correct / admin): quantity ≤ 0 removes the line (the clean setter clamps/removes).
- Actual (buggy / customer): the endpoint persists the raw 0/negative quantity (the line "sticks" at quantity 0 in the API response), an inconsistent state vs. the displayed cart which drops non-positive lines.
- How to spot it: DevTools Network — inspect the PATCH response `items`; the line remains with `quantity: 0`/negative instead of being removed.

### FN_CART_TOTAL_STALE — Cart total does not recompute after a quantity change
- Functional / Moderate / HIPAA: no
- Location: `lib/cart/cart-service.ts` (`getCartView`), resolved at `/cart` (the page passes `totalStale`).
- Trigger: As a customer, on `/cart` increase the FIRST line's quantity and watch the Order summary.
- Expected (correct / admin): Subtotal, Tax, and Total all rise with the quantity.
- Actual (buggy / customer): the line list and Subtotal update, but the Total is computed as if the first line were quantity 1 — it stays "stale" and disagrees with the subtotal.
- How to spot it: cross-screen / arithmetic — Subtotal ≠ Total math; the Total ignores the first line's quantity.

### FN_TAX_FLOOR — Tax is floored to cents instead of rounded
- Functional / Moderate / HIPAA: no
- Location: `lib/cart/totals.ts` (`computeCartTotals`), resolved at `/cart`, `/checkout`, and `/api/checkout`.
- Trigger: As a customer, build a cart whose taxable base makes tax round up (e.g. base $10.07 → tax $0.8056). View `/cart` Tax row.
- Expected (correct / admin): tax rounded to the nearest cent ($0.81).
- Actual (buggy / customer): tax floored down ($0.80); the persisted order total reflects the floored tax too.
- How to spot it: arithmetic — recompute `base * 0.08` and compare; off by a cent downward.

### FN_EXPIRED_COUPON_OK — Expired coupon still applies
- Functional / Moderate / HIPAA: no
- Location: `lib/coupons/coupon.ts` (`validateCoupon`), resolved at `/api/session/coupon`, `/cart`, `/checkout`, `/api/checkout`.
- Trigger: As a customer, apply the expired seed coupon `SPRING2023` (20% off, expired 2023-05-31) in the cart coupon form.
- Expected (correct / admin): rejected with "This coupon has expired." — no discount.
- Actual (buggy / customer): the coupon is accepted and the discount applies.
- How to spot it: edge input — apply a known-expired code and watch the discount appear.

### FN_OOS_ADDABLE — Out-of-stock item can still be added to the cart
- Functional / Moderate / HIPAA: no
- Location: `app/api/session/cart/route.ts` (POST; flag resolved from the signed session cookie). Correct behaviour (reject OOS server-side) is the default.
- Trigger: As a customer, POST `/api/session/cart` with `prod-fiber-supplement` (stock 0), or work around the disabled button.
- Expected (correct / admin): 409 "This item is out of stock." — not added.
- Actual (buggy / customer): 201 and the OOS item is added to the cart.
- How to spot it: DevTools Network — the add request succeeds for a 0-stock item; the item appears in the cart.

### FN_POSTAL_UNVALIDATED — Postal code skips required-field validation at checkout
- Functional / Moderate / HIPAA: no
- Location: `lib/orders/checkout.ts` (`validateShipping`), resolved at `/api/checkout` (server-authoritative validation).
- Trigger: As a customer, submit checkout with every shipping field filled EXCEPT postal code (blank).
- Expected (correct / admin): 422 with "Postal code is required." — order not placed.
- Actual (buggy / customer): postal code is skipped; the order is accepted with a blank postal code.
- How to spot it: edge input — leave postal code blank and submit; the server accepts it. (The client form may still pre-flag it; the bug is the server letting it through.)

<!-- BATCH 2: Functional Difficult + Expert -->

> **Stock baseline (clean default, no flag).** Batch 2 adds the previously-missing
> correct stock behavior so the two stock bugs have something to toggle off.
> `lib/data/stock-store.ts` is a globalThis-anchored ledger seeded from each
> product's `stock`; `getAvailableStock(id)` = seed − reserved. On a successful
> order, `lib/orders/place-order.ts` reserves stock **atomically and
> all-or-nothing** (rejects with a 409 "Some items are no longer available…" if
> any line exceeds availability, otherwise decrements). The add-to-cart OOS check
> (`/api/session/cart` POST) now uses `getAvailableStock`. The ledger resets on
> server restart. This baseline is behind NO flag; `FN_OVERSELL` and
> `FN_CONCURRENT_DOUBLESPEND` toggle it off.

### FN_TAX_BEFORE_DISCOUNT — Tax computed on the pre-discount subtotal (overcharge)
- Functional / Difficult / HIPAA: no
- Location: `lib/cart/totals.ts` (`computeCartTotals`), resolved at `/cart`, `/checkout`, `/api/checkout`.
- Trigger: As a customer, build a cart and apply a coupon (e.g. `SAVE10` on a $100 cart → $10 off). Look at the Tax row.
- Expected (correct / admin): tax = 8% of the **post-discount** base ($90 → $7.20); total $97.20.
- Actual (buggy / customer): tax = 8% of the **pre-discount** subtotal ($100 → $8.00); total $98.00 — the customer is overcharged the tax on the discounted amount.
- How to spot it: arithmetic — Tax ÷ (Subtotal − Discount) ≠ 8%; tax is 8% of the subtotal instead. Only visible when a coupon is applied.

### FN_COUPON_NEGATIVE — Discount not clamped to subtotal → negative total
- Functional / Difficult / HIPAA: no
- Location: `lib/cart/totals.ts` (`computeCartTotals`), resolved at `/cart`, `/checkout`, `/api/checkout`. The unclamped raw discount is sourced in `lib/cart/cart-service.ts`.
- Trigger: As a customer, apply a fixed-dollar coupon worth more than the cart subtotal (clean data clamps it; the bug removes the clamp). Reproducible cleanly at the pure-function level (discount $30 on a $20 cart → total −$10.80).
- Expected (correct / admin): discount clamped to the subtotal; total floors at $0, never negative.
- Actual (buggy / customer): the discount is applied unclamped, so the total goes **negative**.
- How to spot it: arithmetic / edge input — a discount larger than the subtotal yields a negative Total. (Debatable: with the current seed coupons, no single coupon exceeds its own min-subtotal cart, so the in-browser repro needs the reviewer to pick/seed a coupon worth more than the cart; the defect itself is the missing clamp.)

### FN_FILTER_LOST_ON_PAGE — Paginating drops the active filter/search
- Functional / Difficult / HIPAA: no
- Location: `components/products/catalog-pagination.tsx` (flag resolved on the `/products` page and passed in as `dropFilters`).
- Trigger: As a customer, on `/products` apply a search/category/sort (e.g. search "vitamin"), then click Next / a page number.
- Expected (correct / admin): the page links preserve `q`/`category`/`type`/`sort` and only change `page`.
- Actual (buggy / customer): the page links are built from an empty base, so navigating to another page **drops the filter/search** — you land on the unfiltered catalog page N.
- How to spot it: cross-screen — click page 2 with a filter active and the filter vanishes from the URL/results.

### FN_PAGE_COUNT_UNFILTERED — Page count / total uses the unfiltered set
- Functional / Difficult / HIPAA: no
- Location: `lib/catalog/query.ts` (`queryCatalog`), resolved at `/products`.
- Trigger: As a customer, filter/search `/products` so the result set is smaller than the full catalog (e.g. a category with 3 items).
- Expected (correct / admin): "Showing 3 of 3" and a single page that matches the filtered set.
- Actual (buggy / customer): the totals/pager count the **full catalog** (e.g. "Showing 3 of 41" with extra empty trailing pages) while the grid shows only the filtered slice.
- How to spot it: cross-screen — the "of N" count and the number of pager buttons disagree with the items actually shown; later pages render empty.

### FN_OVERSELL — Order can exceed available stock (no stock check)
- Functional / Difficult / HIPAA: no
- Location: `lib/orders/place-order.ts` (toggles off the atomic stock check) via `/api/checkout`.
- Trigger: As a customer, add more units of a low-stock item than exist (e.g. `prod-decongestant`, stock 8 → add 20) and check out.
- Expected (correct / admin): 409 "Some items are no longer available in the requested quantity." — order rejected, nothing reserved.
- Actual (buggy / customer): the stock check is skipped; the order is placed for 20 against 8 in stock, driving availability negative.
- How to spot it: edge input / DevTools Network — order a quantity above stock; the clean app 409s, the buggy app 201s. Cross-check available stock afterward.

### FN_CONCURRENT_DOUBLESPEND — Concurrent orders double-spend the same stock
- Functional / Expert / HIPAA: no
- Location: `lib/orders/place-order.ts` (uses `reserveStockRacy` instead of the atomic `reserveStock`) via `/api/checkout`.
- Trigger: As a customer (two near-simultaneous checkout POSTs, e.g. fire two `/api/checkout` requests for the last units of `prod-decongestant` at the same time).
- Expected (correct / admin): the reservation is atomic and run-to-completion; exactly one of two concurrent orders for the last N units succeeds, the other 409s — never oversold.
- Actual (buggy / customer): the racy path snapshots availability, **yields the event loop, then commits** using the stale snapshot, so both concurrent orders pass the check and both succeed — the stock is double-spent.
- How to spot it: edge input / concurrency — fire two checkout requests in parallel for the last units and observe both succeed (reserved > stock). Observable in the unit test via `Promise.all` of two `reserveStockRacy`/`placeOrder` calls. Made reproducible by the deliberate `await Promise.resolve()` race window between check and commit.

### FN_TOTAL_ROUNDING_EDGE — Wrong total only at specific coupon+tax values (rounding-order edge)
- Functional / Expert / HIPAA: no
- Location: `lib/cart/totals.ts` (`computeCartTotals`), resolved at `/cart`, `/checkout`, `/api/checkout`. The unrounded raw discount is sourced in `lib/cart/cart-service.ts`.
- Trigger: As a customer, hit a cart+percent-coupon whose discount rounds in a way that flips a cent (e.g. subtotal $1.05 with a 10% coupon — most carts are correct). The bug builds the taxed base from the **unrounded** discount instead of the rounded one.
- Expected (correct / admin): taxed base uses the rounded discount; total $1.02 at the edge value (and correct everywhere).
- Actual (buggy / customer): taxed base uses the unrounded discount, so at the edge value the total is $1.03 — off by a cent. **Most other carts compute correctly**, which is what makes it hard to spot.
- How to spot it: arithmetic — recompute (subtotal − rounded discount) + rounded tax and compare; only specific subtotal+coupon combinations are off by a cent. Easy to miss because the common cases are right.

### FN_PARTIAL_CHECKOUT — Order created but the cart is not cleared (inconsistent state)
- Functional / Expert / HIPAA: no
- Location: `lib/orders/place-order.ts` (skips `clearCart` after persisting the order) via `/api/checkout`.
- Trigger: As a customer, complete a checkout successfully, then return to `/cart` (or check the header badge).
- Expected (correct / admin): the order appears in `/orders` and the cart is emptied (coupon cleared too).
- Actual (buggy / customer): the order is created and persisted, but the **cart is left full** — the same items linger, inviting a duplicate purchase and an inconsistent post-checkout state.
- How to spot it: cross-screen — after a successful order, `/orders` shows it but `/cart` still holds the items and the header badge is non-zero.

<!-- BATCH 3: Accessibility -->

### A11Y_INPUT_NO_LABEL — Coupon code input loses its programmatic label
- Accessibility / Easy / HIPAA: no
- Location: `components/cart/coupon-form.tsx` (flag resolved on `app/(storefront)/cart/page.tsx` and passed in as `noLabel`).
- Trigger: As a customer, open `/cart` with at least one item and find the "Coupon code" input in the Order summary.
- Expected (correct / admin): the input is associated with a visible `<label htmlFor="coupon-code">Coupon code</label>` → it has an accessible name.
- Actual (buggy / customer): the `<label>` is removed and no `aria-label` is added, so the input has **no accessible name** (only the placeholder, which doesn't count).
- How to spot it: a11y tool — axe/Lighthouse flags rule **`label`** ("Form elements must have labels" / "form element has no accessible name"). Also visible to a screen reader (announces just "edit text").

### A11Y_LOW_CONTRAST — Catalog price text below the WCAG AA contrast threshold
- Accessibility / Easy / HIPAA: no
- Location: `components/products/product-catalog.tsx` (flag resolved on `app/(storefront)/products/page.tsx` and passed in as `lowContrast`).
- Trigger: As a customer, open `/products` and look at any product card price.
- Expected (correct / admin): price uses the accessible `text-foreground` token (high contrast on the card).
- Actual (buggy / customer): price uses `text-muted-foreground/40` — a near-background gray well below the WCAG AA 4.5:1 ratio for normal text.
- How to spot it: a11y tool — axe/Lighthouse flags rule **`color-contrast`** ("Elements must meet minimum color contrast ratio thresholds"); eyeballing also shows a barely-legible price.

### A11Y_NO_KEYBOARD_FOCUS — Cart quantity steppers not keyboard-operable / no focus ring
- Accessibility / Moderate / HIPAA: no
- Location: `components/cart/cart-line-controls.tsx` (flag resolved on `app/(storefront)/cart/page.tsx` and passed in as `noKeyboardFocus`).
- Trigger: As a customer, open `/cart` with an item and try to Tab to the `−` / `+` quantity steppers and activate them with Enter/Space.
- Expected (correct / admin): the steppers are real `<button>`s — in the tab order, operable via keyboard, with a visible `focus-visible` ring.
- Actual (buggy / customer): the steppers render as plain clickable `<span>`s (`onClick` only, no `role`, no `tabIndex`, `outline:none` with no replacement) → not in the tab order, not triggerable by keyboard, no focus indicator. (The Remove button stays a real button.)
- How to spot it: keyboard — Tab past the steppers and notice they're skipped and never focus-ringed; axe flags missing interactive semantics. Mouse click still works, masking the defect for sighted/mouse users.

<!-- BATCH 4: Performance / Latency -->

> **All Batch-4 performance defects are SIMULATED.** They are injected delays /
> payload-bloat / extra-request patterns gated behind flags; they never touch the
> real app's correctness. Each is resolved at a route/page boundary, admin always
> clean, default OFF. Spotting them is a DevTools Network/Performance task.

### PERF_SLOW_CHECKOUT — Checkout request hangs ~2s with no pending feedback
- Performance / Moderate / HIPAA: no
- Location: `app/api/checkout/route.ts` (flag resolved at the route boundary); delay via `lib/perf/simulated-latency.ts` (`simulateDelay`, `SLOW_CHECKOUT_DELAY_MS` = 2000).
- Trigger: As a customer, complete `/checkout` and submit the order.
- Expected (correct / admin): the `POST /api/checkout` responds promptly (no injected delay).
- Actual (buggy / customer): the request stalls ~2s before responding, with no extra loading/pending feedback — the submit button just appears unresponsive.
- How to spot it: DevTools Network — the `/api/checkout` request shows a ~2s duration / long "Waiting (TTFB)"; nothing on screen explains the wait.

### PERF_PRODUCTS_TTFB — Products page blocks ~1.5s server-side before render
- Performance / Moderate / HIPAA: no
- Location: `app/(storefront)/products/page.tsx` (flag resolved on the page); delay via `lib/perf/simulated-latency.ts` (`simulateDelay`, `PRODUCTS_TTFB_DELAY_MS` = 1500).
- Trigger: As a customer, navigate to `/products`.
- Expected (correct / admin): the page renders immediately (fast TTFB).
- Actual (buggy / customer): the server blocks ~1.5s before producing any HTML — a blank tab with no loading skeleton/streaming, then a sudden full render.
- How to spot it: DevTools Network/Performance — the `/products` document request shows a ~1.5s TTFB; the tab sits blank with no skeleton.

### PERF_CART_WATERFALL — Cart re-fetches each line's product one-by-one (N+1)
- Performance / Difficult / HIPAA: no
- Location: `components/cart/cart-line-prefetch.tsx` (client island), flag resolved on `app/(storefront)/cart/page.tsx` and passed in as `waterfall`. Hits `GET /api/products/[id]` once per line.
- Trigger: As a customer, open `/cart` with several distinct line items.
- Expected (correct / admin): the cart renders from data already on the page — ZERO extra per-item requests.
- Actual (buggy / customer): a client island re-fetches every line's product **sequentially**, one `GET /api/products/[id]` per line (N+1), even though the data is already present. The fetched data is discarded; the only effect is the request chain.
- How to spot it: DevTools Network — a staircase **waterfall** of per-item `/api/products/<id>` requests on cart load (N requests for N lines), each waiting on the previous. Note: implemented as a client-side waterfall island (the cart page is server-rendered), so the requests are observable as client XHR/fetch entries rather than nested SSR fetches.

### PERF_OVERFETCH_PAYLOAD — GET /api/products returns a bloated, duplicated payload
- Performance / Moderate / HIPAA: no
- Location: `app/api/products/route.ts` (flag resolved at the route boundary); bloat via `lib/perf/simulated-latency.ts` (`bloatProductsPayload`).
- Trigger: As a customer, trigger `GET /api/products` (e.g. any client code that lists products / the cart waterfall island).
- Expected (correct / admin): a lean JSON array of products (only the fields the catalog needs).
- Actual (buggy / customer): each item is bloated with large unused/duplicated fields (`_raw`, `_duplicate`, `_description_long`, `_seoKeywords[100]`, `_auditTrail[50]`) — a response many times larger than needed.
- How to spot it: DevTools Network — the `/api/products` response **Size** is far larger than the rendered catalog needs; inspect the payload to see duplicated/unused fields.

### PERF_NO_CACHE — Catalog API forces no-store so every navigation refetches
- Performance / Moderate / HIPAA: no
- Location: `app/api/products/route.ts` (flag resolved at the route boundary) — sets `Cache-Control: no-store, no-cache, must-revalidate`.
- Trigger: As a customer, navigate to/away from a view that fetches `GET /api/products` repeatedly.
- Expected (correct / admin): the response is cacheable/reusable (no forced no-store), so repeat navigations don't redundantly refetch.
- Actual (buggy / customer): the response forces `no-store`, so the browser refetches the full catalog on every navigation.
- How to spot it: DevTools Network — the `/api/products` response carries `Cache-Control: no-store`; the same request repeats (never served "from cache") on each navigation.

<!-- BATCH 5: Security / Transport (HIPAA) -->

> **Batch-5 defects are security/transport bugs.** Each toggles OFF a correct
> protection that exists in the clean baseline; the admin always gets the
> secure path (the bypass is inert for admins). Default OFF. The IDOR + PHI
> over-fetch pair is a CHAIN (see notes).

### SEC_IDOR_ORDER — Order detail drops the ownership check (IDOR) 🔗
- Security / Difficult / HIPAA: **yes**
- Location: `app/(storefront)/orders/[id]/page.tsx` resolves the flag and passes `dropOwnershipCheck` into `getOrderForViewer` (`lib/data/orders.ts` → `findOrderForViewer` in `lib/orders/order.ts`).
- Trigger: As customer Dana, open one of your own orders to learn the order-id format (`MB-YYYYMMDD-NNNN`), then change the id in the URL to another customer's order (e.g. one of Omar's seeded orders).
- Expected (correct / admin): a foreign (or unknown) order id resolves to `null` → the styled 404. A customer only ever sees their own orders; admins may see any.
- Actual (buggy / customer): the ownership check is bypassed, so ANY existing order id renders in full — including that customer's shipping address (PII) and prescription block (PHI: patient name, DOB, prescribing doctor, Rx number).
- How to spot it: change the order id in the URL to one you don't own and confirm someone else's order (and PHI) loads instead of a 404. This is a classic IDOR; the leaked order id is also the **chain source** for SEC_PHI_OVERFETCH.

### SEC_PHI_OVERFETCH — Account API over-fetches PHI the view never needs 🔗
- Security / Difficult / HIPAA: **yes**
- Location: `app/api/account/route.ts` (GET) resolves the flag and passes `overfetchPhi` into `readAccountForApi` (`lib/account/account-service.ts`).
- Trigger: As a customer, open `/account` (which calls `GET /api/account`) and inspect the JSON response in DevTools Network.
- Expected (correct / admin): the response carries only the fields the view renders — addresses plus the three insurance fields (`provider`, `memberId`, `groupNumber`).
- Actual (buggy / customer): the `insurance` object is padded with sensitive PHI the UI never displays — `subscriberSsn`, `dateOfBirth`, `diagnosisCodes[]`, `medicationHistory[]` — i.e. the API over-fetches/over-returns PHI that should stay server-side.
- How to spot it: DevTools Network — the `/api/account` response body contains PHI fields with no on-screen counterpart. **Chain:** an attacker who used SEC_IDOR_ORDER to enumerate/confirm a victim then leans on this over-fetch to pull PHI the screens never show.

### SEC_MISSING_ADMIN_AUTH — Admin bug-flags API drops its admin guard
- Security / Difficult / HIPAA: no
- Location: `app/api/admin/bug-flags/route.ts` — the guard (`adminGuardPasses`) resolves the current user and the flag at the route boundary. The bypass is inert for admins, so the admin panel never breaks.
- Trigger: As a signed-in customer (or logged out), call `GET`/`POST /api/admin/bug-flags` directly (e.g. via DevTools/curl).
- Expected (correct / admin): non-admins get **403** for both read and toggle; only an admin can read or change flags.
- Actual (buggy / customer): the admin guard is dropped for non-admins, so a customer can read the full flag map AND toggle any flag (`{key,enabled}` / `{reset:true}`) — a privilege-escalation hole that lets a customer turn other bugs on/off.
- How to spot it: as a non-admin, hit the endpoint and observe a 200 + flag map instead of 403; toggling a flag actually persists.

### SEC_CREDS_IN_URL — Login sends credentials in the URL query string
- Security / Moderate / HIPAA: no
- Location: `components/auth/credentials-form.tsx` (`credentialsInUrl` prop, resolved on `app/login/page.tsx`); companion GET handler added to `app/api/auth/login/route.ts` so the buggy flow works end-to-end.
- Trigger: As a customer, sign in at `/login` and watch the request in DevTools Network / the URL bar.
- Expected (correct / admin): credentials travel in the **POST body** only (`POST /api/auth/login`); they never appear in the URL.
- Actual (buggy / customer): the form submits a **GET** with `?email=…&password=…`, so the email and password are exposed in the URL bar, browser history, referrer headers, and server access logs.
- How to spot it: DevTools Network — the login request is a GET whose query string contains the plaintext password; also visible in the address bar / history.

### SEC_TOKEN_LOCALSTORAGE — Client copies the session identity into localStorage
- Security / Moderate / HIPAA: no
- Location: `components/auth/credentials-form.tsx` (`persistIdentityToLocalStorage` prop, resolved on `app/login/page.tsx`).
- Trigger: As a customer, sign in at `/login`, then check `localStorage` in DevTools (Application → Local Storage).
- Expected (correct / admin): the session lives only in the **httpOnly** `mb_session` cookie (not JS-readable); nothing is written to `localStorage`.
- Actual (buggy / customer): on a successful login the identity (`user` object) is also written to `localStorage` under `mb_identity`, where any XSS can read/exfiltrate it.
- How to spot it: DevTools Application tab — an `mb_identity` entry appears in Local Storage after login (it should not exist); a quick `localStorage.getItem("mb_identity")` in the console returns the identity.

### SEC_PRICE_TAMPER — Checkout trusts a client-supplied total
- Security / Difficult / HIPAA: no
- Location: `app/api/checkout/route.ts` reads an optional `clientTotal` from the body and passes `trustClientTotal` into `placeOrder` (`lib/orders/place-order.ts`).
- Trigger: As a customer, intercept/replay `POST /api/checkout` with a `clientTotal` field set to an arbitrary low value (e.g. `0.01`).
- Expected (correct / admin): the server **recomputes** the order total from the cart and ignores any client-supplied `clientTotal`; the order is always priced server-side.
- Actual (buggy / customer): the server trusts the client `clientTotal` and snapshots it onto the order, so a tampered request underpays while still placing the order.
- How to spot it: tamper with the checkout request body (add `clientTotal`) and confirm the resulting order's total reflects the tampered value instead of the recomputed cart total. (The clean baseline never sends `clientTotal`, so normal checkout is unaffected.)

<!-- BATCH 6: UI antipattern + UX -->

> **Batch-6 defects are UI-antipattern / UX bugs.** Each toggles OFF a usability
> safeguard that exists in the clean baseline; admins always get the good
> experience (the bug branch is inert for admins). Default OFF. Spotting them is
> a manual/interaction task (click, submit, navigate, read the screen).

### UI_DESTRUCTIVE_NO_CONFIRM — Cart remove is instant & destructive, no confirmation
- UI antipattern / Easy / HIPAA: no
- Location: `components/cart/cart-line-controls.tsx` (`removeWithoutConfirm` prop, resolved on `app/(storefront)/cart/page.tsx`).
- Trigger: As a customer, open `/cart` with an item and click the Remove (trash) button.
- Expected (correct / admin): Remove asks for confirmation (`window.confirm("Remove … from your cart?")`) before deleting; cancelling keeps the line.
- Actual (buggy / customer): Remove deletes the line immediately with no confirmation — a destructive action with no undo or guard.
- How to spot it: click Remove and notice the item vanishes instantly with no "are you sure?"; an accidental click is unrecoverable.

### UI_NO_SUBMIT_FEEDBACK — Checkout submit gives no visible feedback
- UI antipattern / Easy / HIPAA: no
- Location: `components/checkout/checkout-form.tsx` (`noSubmitFeedback` prop, resolved on `app/(storefront)/checkout/page.tsx`).
- Trigger: As a customer, fill `/checkout` and click "Place order".
- Expected (correct / admin): the button disables and switches to "Placing order…" while the request is in flight.
- Actual (buggy / customer): the button stays enabled and keeps its "Place order" label — no pending/disabled state — so the submit looks like nothing happened (and invites double-clicks).
- How to spot it: submit and watch the button; with the bug there is no spinner/label change/disable while the order is being placed (most visible alongside a slow request).

### UI_MISLEADING_ICON — Cart remove button shows a misleading icon
- UI antipattern / Easy / HIPAA: no
- Location: `components/cart/cart-line-controls.tsx` (`misleadingRemoveIcon` prop, resolved on `app/(storefront)/cart/page.tsx`).
- Trigger: As a customer, open `/cart` and look at the Remove control.
- Expected (correct / admin): the destructive Remove action uses a trash-can icon (`Trash2`).
- Actual (buggy / customer): the Remove button shows a friendly **Heart** icon that doesn't match its destructive action (the `aria-label` stays "Remove …", so the icon and meaning conflict).
- How to spot it: eyeball the Remove control — a heart on a delete button; clicking it still deletes the line.

### UI_FORM_CLEARS_ON_ERROR — A validation error wipes the entered fields
- UI antipattern / Moderate / HIPAA: no
- Location: `components/checkout/checkout-form.tsx` (`clearFieldsOnError` prop, resolved on `app/(storefront)/checkout/page.tsx`).
- Trigger: As a customer, fill out most of `/checkout` but leave a required field blank, then submit so validation fails.
- Expected (correct / admin): the error highlights the offending fields and **retains** everything else typed — the customer just fixes the one field.
- Actual (buggy / customer): the validation error resets the whole form, wiping every entered shipping/payment/PHI field, forcing a full re-type.
- How to spot it: trigger a validation error and notice all your input disappears instead of only the bad field being flagged.

### UX_VAGUE_ERROR — Checkout error is a vague "Something went wrong"
- UX / Easy / HIPAA: no
- Location: `components/checkout/checkout-form.tsx` (`vagueError` prop, resolved on `app/(storefront)/checkout/page.tsx`).
- Trigger: As a customer, cause any checkout error (validation, server rejection, or a network failure).
- Expected (correct / admin): a specific, actionable message — "Please fix the highlighted fields.", the server's reason, or "Could not reach the server. Please check your connection and try again."
- Actual (buggy / customer): every error path collapses to a generic "Something went wrong." with no reason and no next step.
- How to spot it: force an error and read the message — it tells the customer nothing about what failed or how to recover.

### UX_NO_ORDER_CONFIRM — No clear success cue after placing an order
- UX / Easy / HIPAA: no
- Location: `app/(storefront)/orders/[id]/page.tsx` (flag resolved on the page; suppresses the `?placed=1` success banner).
- Trigger: As a customer, complete a checkout — you land on `/orders/<id>?placed=1`.
- Expected (correct / admin): a prominent "Order placed — thank you!" confirmation banner (role="status") tops the order page.
- Actual (buggy / customer): the success banner is suppressed, so after placing the order there is no clear "it worked" cue — the customer can't tell the order succeeded.
- How to spot it: place an order and notice the absence of any success confirmation on the landing order page. (Behavior + toggle test live with the Batch-5 commit, where the order page was already being edited; entry recorded here as a Batch-6 bug.)

### UX_SURPRISE_TAX — Tax hidden until the final checkout step
- UX / Moderate / HIPAA: no
- Location: `app/(storefront)/cart/page.tsx` (`hideTaxOnCart`, flag resolved on the page).
- Trigger: As a customer, view `/cart`, then proceed to `/checkout`.
- Expected (correct / admin): the cart summary shows the "Tax (8%)" line and a tax-inclusive Total, so the customer sees tax before checkout.
- Actual (buggy / customer): the cart hides the tax line and shows only a "Subtotal" total; tax first appears at the final checkout step — a surprise charge at the end.
- How to spot it: compare the cart summary (no tax) with the checkout summary (tax added) — the total jumps at the last step.

### UX_LOST_CHECKOUT_PROGRESS — Back navigation loses entered checkout data
- UX / Moderate / HIPAA: no
- Location: `components/checkout/checkout-form.tsx` (`loseProgressOnBack` prop, resolved on `app/(storefront)/checkout/page.tsx`).
- Trigger: As a customer, fill `/checkout`, navigate away (e.g. back to `/cart`), then use the browser Back button to return.
- Expected (correct / admin): the browser's bfcache restores the form with the entered values intact.
- Actual (buggy / customer): on a bfcache restore (`pageshow` with `persisted`), the form resets itself, so coming Back loses everything the customer typed.
- How to spot it: fill the form, go Back-and-forward, and notice the fields are blank instead of restored.

### UX_NO_PAGE_TOTAL — Catalog pagination shows no total pages/results indicator
- UX / Easy / HIPAA: no
- Location: `components/products/catalog-pagination.tsx` (`hidePageTotal` prop, resolved on `app/(storefront)/products/page.tsx`).
- Trigger: As a customer, open `/products` with enough items to paginate and look at the pager.
- Expected (correct / admin): a "Page X of Y" indicator sits above the page links so the customer knows how far the catalog goes.
- Actual (buggy / customer): the "Page X of Y" indicator is removed, leaving bare page links with no sense of total pages/results.
- How to spot it: look at the pager — there's no "Page X of Y" / total to orient by (the top-of-list "Showing N of M" count is a separate element and unaffected).
