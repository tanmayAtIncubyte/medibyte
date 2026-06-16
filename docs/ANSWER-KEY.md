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
<!-- BATCH 4: Performance / Latency -->
<!-- BATCH 5: Security / Transport (HIPAA) -->
<!-- BATCH 6: UI antipattern + UX -->
