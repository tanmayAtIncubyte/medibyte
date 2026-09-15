# Candidate observations — reviewer analysis

These are observations from a tester. Below, each is classified against the
private answer key (`docs/ANSWER-KEY.md`) and the actual code. At the time of
writing **no code was changed** — anything that genuinely needed a fix was written
up, not fixed.

> **Status update 2026-09-15 — the three genuine gaps have since been actioned.**
> - **(16) Remove insurance** and **(17) Delete a saved address** were **built**
>   (`feat/account-delete`, merged to `dev`). Both sit in
>   `components/account/account-manager.tsx` behind a `window.confirm`; the state
>   transitions are `removeAddress` / the insurance clear in `lib/account/account.ts`.
>   They are **clean features, not seeded bugs** — `UI_DESTRUCTIVE_NO_CONFIRM`
>   deliberately does **not** cover them (it is cart-Remove only).
> - **(15) Format validation on account fields** — the "required-only, not format"
>   nuance was also **built**: `lib/account/account.ts` now checks full-name shape,
>   US-ZIP / international postal shape and insurance-ID shape on top of the required
>   checks. Deliberately **account-scoped** so `/checkout` keeps its required-only
>   postal behaviour and `FN_POSTAL_UNVALIDATED` survives intact.
> - **(14) No saved-address picker at checkout** was **not** built. It was instead
>   promoted into the bug registry as **`CHECKOUT_NO_SAVED_ADDRESS_PREFILL`** (one of
>   the five Batch-7 internal-QA defects, 45 → 50). ⚠️ It is registered but **not yet
>   wrapped in `isBugActive`**, so it is always on — admin and Steve see it too.
> - Four further defects from the **internal** QA pass (not from this tester's list)
>   were promoted alongside it: `NAV_LINKS_SHOWN_PRELOGIN`,
>   `HEADER_NAV_NOT_RESPONSIVE`, `RX_DOB_UNVALIDATED` and
>   `CART_SESSION_NOT_USER_BOUND`. All five Batch-7 entries share the same caveat —
>   registered and graded, but not yet `isBugActive`-gated. See
>   `docs/ADMIN-RUNBOOK.md` §4.7 and the Batch 7 section of `docs/ANSWER-KEY.md`.
> - **(19)'s incidental finding** (product detail shows seed stock, not live
>   availability) is still open and still not seeded.

**Legend**
- ✅ **Seeded** — a hit on an intended bug. Working as designed for the assessment; no fix.
- ℹ️ **By design / expected** — not a bug; a POC scope choice or correct behavior.
- ⚠️ **Genuine gap** — real limitation in the *reference* app, not seeded. A fix/decision candidate.
- ❓ **Needs repro** — the observation contradicts the code; reproduce before deciding.

---

### 1. Pagination shown even though there is only 1 product
✅ **Seeded — `FN_PAGE_COUNT_UNFILTERED`.** The pager/counts are computed against
the *full* catalog, not the filtered result set, so extra (empty) pages appear
when a search narrows to 1 item. (`lib/catalog/query.ts` — `totalItems =
pageCountUnfiltered ? products.length : sorted.length`.) The candidate caught it.

### 2. Clicking "Next" clears the search query; searches aren't sticky
✅ **Seeded — `FN_FILTER_LOST_ON_PAGE`.** Page links are built from an empty base,
so paginating drops `q`/`category`/`type`/`sort` and lands you on the unfiltered
catalog. (`components/products/catalog-pagination.tsx`.) Clean hit.

### 3. Pricing is greyed out
✅ **Seeded — `A11Y_LOW_CONTRAST`.** Catalog price uses `text-muted-foreground/40`,
a near-background gray below WCAG AA. It's meant to look washed out. Good catch
(this is normally found with an a11y tool; eyeballing it counts too).

### 4. Search not working even with a correct name ("ibuprofen")
✅ **Seeded — `FN_PAGINATION_OFFBYONE`. (Verified in-browser 2026-07-27.)** My first
pass called this "needs repro / likely not seeded" — that was **wrong**. The search
logic *is* clean (`matchesSearch` substring on `product.name`); the result set is
then sliced by the **off-by-one pagination**, which shifts the page-1 window start
from index 0 to 1 and so **drops the first item of every filtered set**:
- As customer Dana, `?q=vitamin` matched 3 products but showed **2** — "Vitamin D3"
  (the first) was dropped; only Vitamin C + Multivitamin rendered.
- `?q=ibuprofen` matched exactly **1**, so the off-by-one dropped it and the page
  showed **0 of 39** ("No products are available right now.") — which reads as
  "search is broken."
- As **admin** (flag off) the same `?q=ibuprofen` correctly showed "1 of 1."
So a search that narrows to a single hit disappears entirely. **This is the nastier
face of `FN_PAGINATION_OFFBYONE`** — the answer key frames it as "first product
dropped / boundary skips one," but on a single-result filter it presents as a
totally broken search. Worth noting in the answer key as a known manifestation.
No fix — it's an intended bug; the candidate found it but mis-labelled the cause.

### 5. Sorting is not working
✅ **Seeded (likely) — `FN_PRICE_SORT_LEXICAL`.** Price sort compares prices as
strings, so `$10.x` sorts before `$3.x` — the order looks wrong/"broken."
Name sorts (`name-asc`/`name-desc`) are clean.
- **Note:** confirm *which* sort the tester used. If they meant "Price: Low→High
  gives a nonsensical order," that's this bug. If they meant "sort does literally
  nothing," reproduce — that would be outside the seeded set.

### 6. No product images
ℹ️ **By design — not seeded, not a bug.** The seed catalog ships without image
assets (`data/products.ts` has no image field wired to real art). It's a POC
realism gap, not a planted defect.
- **Decision (not a fix):** if you want the store to feel more real, adding
  placeholder imagery is a product decision — flag if you want it on the backlog.

### 7. Prices differ between the product page and the cart
✅ **Seeded — `FN_PRICE_DECIMALS`.** `formatPrice` renders one decimal with no cent
rounding (`$10.5`) on `/products` and `/products/[id]`; the cart formats normally,
so the same item's price *reads* differently across screens. The cross-screen
disagreement is exactly the intended tell.

### 8. "Favourite" from the cart removes the product from the cart
✅ **Seeded — `UI_MISLEADING_ICON`.** The Remove button shows a **Heart** icon (reads
as "favourite") but its action is destructive delete; the `aria-label` still says
"Remove …". (`components/cart/cart-line-controls.tsx`.) Exactly the trap.

### 9. Place order with address but no payment → address is wiped + "Something went wrong"
✅ **Seeded — two bugs at once:**
- `UI_FORM_CLEARS_ON_ERROR` — a validation error resets the whole form, wiping the
  address (and everything else) instead of flagging the one bad field.
- `UX_VAGUE_ERROR` — every error collapses to a generic "Something went wrong."
  with no reason or next step.
Strong observation — it surfaced both in one flow.

### 10. No validation on any `/checkout` field except card number/expiry/cvv
ℹ️ **Not a gap — validation exists. (Verified in code 2026-07-27.)** `CheckoutForm`
client-validates **every** field before it POSTs: `validateShipping(shipping)` +
`validatePayment(payment)` + `validatePrescription(...)` for each Rx line, and
highlights each bad field (`components/checkout/checkout-form.tsx` lines 108–133).
The server re-validates shipping too. The **only** intentional hole is postal code
server-side (`FN_POSTAL_UNVALIDATED`).
- Why it *looked* like "no validation": for customers `UI_FORM_CLEARS_ON_ERROR` +
  `UX_VAGUE_ERROR` are on, so a failed submit **wipes the fields** and shows
  "Something went wrong" — the per-field errors point at now-empty inputs, so the
  validation is invisible. That's two seeded bugs, not a missing feature. **No fix.**

### 11. Orders seem to get duplicated
✅ **Seeded (emergent) — no separate defect.** Duplicate orders fall out of the
seeded set combining:
- `UI_NO_SUBMIT_FEEDBACK` — "Place order" stays enabled with no pending state, and
- `PERF_SLOW_CHECKOUT` — the request hangs ~2s with no feedback,
so a tester naturally clicks again → a second order. `FN_PARTIAL_CHECKOUT` (obs 12)
compounds it by leaving the cart full, inviting a re-order.
- **Note:** `FN_CONCURRENT_DOUBLESPEND` is a related seeded race, but that's about
  double-*spending stock*, not duplicate order records. The duplication the tester
  saw is the feedback/latency pair above.

### 12. Item isn't removed from the cart after a successful order ("might be a requirement")
✅ **Seeded — `FN_PARTIAL_CHECKOUT`.** The order is created and persisted but the cart
is deliberately **not** cleared, leaving an inconsistent post-checkout state. The
tester's hedge is understandable, but it *is* the planted bug — good instinct to
flag it anyway.

### 13. Payment method not shown on `/orders`
ℹ️ **Not seeded — by design / display gap.** The orders view doesn't render a payment
method. Seeded order-page bugs are `FN_ORDER_DATE_RAW` and `UX_NO_ORDER_CONFIRM`;
payment-method display isn't one of them.
- **Decision (not a fix):** whether order history should surface a payment method is
  a product choice. Flag if you want it added.

### 14. Checkout doesn't prompt to use a saved address (even though addresses exist)
⚠️ **Genuine gap — not seeded.** There is no saved-address picker in the checkout
form (no such control in `components/checkout`). Addresses are viewable/editable on
`/account` but checkout makes you re-type. Real UX limitation of the POC, not a
planted bug.
- **Fix candidate:** wiring saved addresses into checkout is a legitimate
  enhancement — noting it here, not building it.

### 15. No validation for address fields on the account page
ℹ️ **Not a gap — validation exists. (Verified in code 2026-07-27.)** `saveAddress`
runs `validateAddress` = `validateShipping` (all shipping fields required) **plus**
"Label is required"; `saveInsurance` requires all three insurance fields
(`lib/account/account.ts`). The PATCH returns 422 + per-field errors and the form
renders them. So address/insurance edits **are** validated.
- Only nuance: it's **required-field** validation, not **format** validation (any
  non-blank value is accepted — e.g. a non-numeric postal code saves). That's a
  minor, arguably by-design POC limitation, not the reported "no validation." No fix
  needed unless you specifically want format rules.

### 16. Can't remove insurance details
⚠️ **Not seeded — feature not implemented.** `account-manager.tsx` supports *editing*
insurance (edit form + save) but exposes **no delete/clear** action. Working as
built; simply not a capability.
- **Fix candidate:** if "remove insurance" is desired, it's an unbuilt feature, not a
  bug. Noted for a decision.

### 17. Can't delete a saved address
⚠️ **Not seeded — feature not implemented.** Same as #16: addresses can be viewed/
edited, but there's no delete handler. POC scope limitation, not a planted defect.
- **Fix candidate:** add address deletion if wanted — decision, not done here.

### 18. Both "Account" and the username ("Dana Customer") appear in the top menu
ℹ️ **By design — not a bug.** The header intentionally shows an **Account** nav link
plus the signed-in user's name (the account/user menu). It reads as slightly
redundant but is deliberate chrome.
- **Optional polish:** if the redundancy bothers you, collapsing the name into the
  Account menu is a cosmetic tweak — not required.

### 19. No item limit on quantity for the same product
✅ **Seeded — `FN_OVERSELL`. (Verified in-browser 2026-07-27.)** Reproduced end to
end as customer Dana with `prod-decongestant` (on-screen "Low stock (8 left)"):
- Set the cart line to **quantity 20** (`PATCH /api/session/cart` → 200, no cap).
- Checkout summary showed Qty 20 / Subtotal $179.80.
- `POST /api/checkout` returned **201** and placed order **MB-20260727-0001** for
  **20 units against 8 in stock**. The clean path 409s ("Some items are no longer
  available in the requested quantity."); here the stock check is skipped.
So "no limit on quantity ordered" is exactly `FN_OVERSELL` — you can order more than
exists. A real seeded hit, not a by-design gap. No fix.
- **Incidental:** after overselling 20, the product detail page still reads "Low
  stock (8 left)" — the detail label shows the **seed** stock, not live availability
  (`getAvailableStock`), so the store's displayed count never reflects the oversell.
  Minor and separate from `FN_OVERSELL`; noting it in case you want the detail page
  to show true availability. (Not seeded, not fixed.)

### 20. Tax is applied on the total before discount
✅ **Seeded — `FN_TAX_BEFORE_DISCOUNT`.** Tax is computed as 8% of the *pre-discount*
subtotal instead of the post-discount base, overcharging the tax on the discounted
amount. (`lib/cart/totals.ts`.) Clean, sharp catch — this is a Difficult-tier bug.

### 21. Searching "ib" shows an irrelevant product
ℹ️ **Expected — working as designed.** Search is a substring match on name, and
`"Daily Fiber Supplement Powder"` contains "ib" (in "F**ib**er"), so it correctly
matches "ib" alongside "**Ib**uprofen." Not a bug — it's how substring search
behaves.
- **Note:** if you consider substring-only matching too loose (no relevance ranking),
  that's a search-quality *design* opinion, not a defect. Pairs with obs 4 — worth
  reproducing #4 together with this to see exactly what the tester's search returned.

---

## Summary

**Seeded bugs correctly found (12):** `FN_PAGE_COUNT_UNFILTERED` (1),
`FN_FILTER_LOST_ON_PAGE` (2), `A11Y_LOW_CONTRAST` (3),
`FN_PAGINATION_OFFBYONE` (4, verified), `FN_PRICE_SORT_LEXICAL` (5),
`FN_PRICE_DECIMALS` (7), `UI_MISLEADING_ICON` (8),
`UI_FORM_CLEARS_ON_ERROR` + `UX_VAGUE_ERROR` (9),
`UI_NO_SUBMIT_FEEDBACK` + `PERF_SLOW_CHECKOUT` (11), `FN_PARTIAL_CHECKOUT` (12),
`FN_OVERSELL` (19, verified), `FN_TAX_BEFORE_DISCOUNT` (20). Plus the seeded
`FN_POSTAL_UNVALIDATED` embedded in (10). Solid coverage across functional /
a11y / UI / UX / perf.

**Not bugs — by design / expected (4):** no product images (6), payment method on
orders (13), Account + username in menu (18), "ib" substring match (21).

**~~Needs reproduction~~ — RESOLVED by in-browser verification (2026-07-27):**
- (4) "ibuprofen" search → **seeded `FN_PAGINATION_OFFBYONE`** (a 1-result search is
  dropped by the off-by-one), NOT an unseeded UI bug. My first pass was wrong.
- (19) quantity limit → **seeded `FN_OVERSELL`** (ordered 20 vs stock 8, order placed),
  NOT a by-design gap.
- **Correction:** both were reclassified from "needs repro" to confirmed seeded hits.

**Incidentally confirmed live during verification:** `FN_PRICE_DECIMALS` (decongestant
detail `$9.0` vs cart `$8.99`), `FN_TRIPWIRE_COPY` (decongestant is OTC yet its copy
says "Prescription required"), `FN_PAGE_COUNT_UNFILTERED` ("of 39" on a filtered view),
and the hidden self-registration link on `/login`.

> **Test state left behind:** verifying (19) placed a real order (`MB-20260727-0001`)
> and — because of `FN_PARTIAL_CHECKOUT` — left the 20-qty item in Dana's cart on the
> local dev server (in-memory; clears on restart). Harmless, but noted.

**Genuine gaps in the reference app — fix/decision candidates (not seeded, not fixed here):**
- (14) No saved-address picker at checkout.
- (16) No way to remove insurance details.
- (17) No way to delete a saved address.

> (10) and (15) were investigated and **dropped** — validation already exists in both
> places (verified in code 2026-07-27); the perceived absence at checkout is the
> seeded `UI_FORM_CLEARS_ON_ERROR` + `UX_VAGUE_ERROR` pair. So only 14/16/17 remain.
> None of these are defects the assessment planted; they're real limitations of the
> reference build.

---

## What happened next (2026-09-15)

All three gaps were resolved, in two different ways:

| # | Gap | Outcome |
|---|---|---|
| 16 | No way to remove insurance | **Built** — "Remove insurance details" on `/account`, behind `window.confirm` (`feat/account-delete` → `dev`). |
| 17 | No way to delete a saved address | **Built** — "Delete {label} address" on `/account`, behind `window.confirm` (same branch). |
| 15 | Required-only, not format, validation on account fields | **Built** — name / postal / insurance-ID format rules in `lib/account/account.ts`, deliberately account-scoped so `FN_POSTAL_UNVALIDATED` at checkout is untouched. |
| 14 | No saved-address picker at checkout | **Not built — seeded instead.** Promoted to registry key `CHECKOUT_NO_SAVED_ADDRESS_PREFILL`. |

The Batch-7 promotion took the seeded count from 45 to 50. The five promoted entries
are recorded in `lib/bug-registry.ts` and `data/bug-flags.json`, but none of them is
wrapped in an `isBugActive(...)` branch yet — so they are **always on, admin and Steve
included**, and their flags are inert. Wrapping each entry's `location` is the
outstanding work that would make them behave like every other seeded bug.
