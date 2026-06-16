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
<!-- BATCH 3: Accessibility -->
<!-- BATCH 4: Performance / Latency -->
<!-- BATCH 5: Security / Transport (HIPAA) -->
<!-- BATCH 6: UI antipattern + UX -->
