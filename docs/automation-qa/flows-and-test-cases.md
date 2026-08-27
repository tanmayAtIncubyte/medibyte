# MediByte — Automation QA: Flows & Test Case Catalog

> Internal reference for the automation-QA track. Candidate-facing assignment
> briefs (`assignment-easy.md`, `assignment-medium.md`, `assignment-hard.md`)
> are derived from this document but are written and shared separately.

This catalog defines the three automation flows candidates are assigned, one
per experience tier, plus the structural-difficulty pattern behind them. Every
flow is reachable from a single login — the automation-QA account:

| Email                 | Password    |
| ---------------------- | ----------- |
| `steve@example.test`  | `steve1234` |

This account sees the app exactly as clean as an admin login does, but has no
admin-panel access — it is a pure storefront customer account, so every flow
below is exactly what that login sees, nothing hidden and nothing gated.

---

## The 3-tier structural-difficulty pattern

The storefront DOM is intentionally hardened against brittle automation: no
`id`, no `data-testid`, no other guessable hook. Every element is still fully
reachable by its real accessible name or role (label text, button text, ARIA
role) — hardening is structural, never at the expense of accessibility. The
three tiers below describe *how* an element must be located, in increasing
order of locator difficulty.

### Tier 1 — Unique accessible names

Every control on the page has a name that is unique on that page. A locator
strategy built purely on accessible name + role (e.g. "find the textbox
labeled 'Search products'", "find the button named 'Apply'") resolves to
exactly one element with no further scoping needed.

**Reference implementation:** `components/products/catalog-toolbar.tsx` (the
product catalog's search/category/type/sort controls — each `<label>`
implicitly wraps its own input or `<select>`, so there is no `id`/`htmlFor`
pair to key off, only the label text itself) and `components/cart/coupon-form.tsx`
(the coupon code input — implicitly label-wrapped when its label is visible;
its error message uses a React `useId()`-generated id for the
`aria-describedby` link rather than a static, readable string, so the
relationship exists in the accessibility tree without exposing a guessable
attribute value).

### Tier 2 — Duplicate accessible names + async state

The same accessible name appears more than once on the page because the same
component repeats (once per row/line/card). A locator that just searches for
"the button named X" is ambiguous and must first be scoped to the correct
row/line/card before it can find the right instance. On top of that, some
actions trigger a server round-trip and re-render before the new state (a
recalculated total, an applied coupon) appears, so a script must wait for
that state rather than asserting immediately after the action.

**Reference implementation:** `components/cart/cart-line-controls.tsx` — a
multi-line cart renders one quantity control and one remove control per line,
and every line's controls share the exact same accessible-name pattern
("Decrease quantity of {product name}", "Increase quantity of {product
name}", "Remove {product name} from cart"). Because each line's product name
differs, the *full* accessible name is still unique per line, but a
locator strategy that isn't scoped to the containing cart line (rather than
matched by a generic string like "Remove") will find every line's control and
must disambiguate. The cart's totals and the coupon form's applied/removed
state (`components/cart/coupon-form.tsx`) both recompute asynchronously after
a mutation — the visible total does not update until the page has refreshed
with the new server state.

### Tier 3 — Cross-page and cross-section verification

The correct answer for a check on one page or section depends on data entered
somewhere else entirely — a different page, a different step of a multi-step
flow, or a different section of the same page. There's no single element to
locate; verification requires reading a value in one place, navigating away,
and comparing it against a value read in another place. This tier also covers
positionally- or structurally-disambiguated elements: where two pieces of the
page share a section heading or label (e.g. "Edit" appearing next to more than
one saved address) and only their position/order or nearest heading tells them
apart, plus any nested/layered UI (a dialog opened from a button, tabs within
a panel) a candidate might need to navigate to reach the two things being
compared.

**Reference implementation:** `/account` (saved address + insurance,
editable) versus the shipping section of `/checkout` versus the shipping
address and order line shown on an order's detail page under `/orders/[id]`
— the same shipping/insurance data is entered or displayed in three different
places, and Flow 3 requires reading all three and confirming they agree. The
closest existing structural precedent in this codebase for "nested/layered"
UI a candidate might encounter while exploring the app is the info/preview
affordances in `components/admin/bug-reference.tsx` (a Popover opened from an
info icon, and a Dialog opened from a "Preview" button) — that screen itself
is admin-only and out of scope for the automation flows, it is referenced here
purely as the structural pattern (trigger → nested panel → content) that
Tier 3 UI looks like when it does appear in a flow.

---

## Flow 1 — Discovery & Purchase (Tier 1 / 1–3 years)

**Journey:** Log in as Steve → search, filter, and sort the product catalog on
`/products` → open a product's detail page → add it to the cart → verify the
cart's contents and total.

### Test cases

**TC1.1 — Search returns matching results**
- *Preconditions:* Logged in as Steve; on the `/products` page.
- *Steps:* In the "Search products" field, enter a term that matches a known
  product name (e.g. "ibuprofen"). Click "Apply".
- *Expected result:* The product list shows only products whose name/category
  matches the search term; no unrelated products are shown.

**TC1.2 — Category filter narrows results**
- *Preconditions:* Logged in as Steve; on the `/products` page with no search
  term entered.
- *Steps:* Select a specific category from the "Category" dropdown. Click
  "Apply".
- *Expected result:* Every product shown belongs to the selected category;
  products from other categories are no longer shown.

**TC1.3 — Sort by price changes list order**
- *Preconditions:* Logged in as Steve; on the `/products` page with more than
  one product visible.
- *Steps:* Select "Price: low to high" from the "Sort by" dropdown. Click
  "Apply".
- *Expected result:* The visible products are ordered by ascending price,
  first item cheapest.

**TC1.4 — Adding a product to the cart updates the cart badge**
- *Preconditions:* Logged in as Steve; cart is empty. Note the "Cart" link's
  item count in the site header before starting.
- *Steps:* Open any product's detail page from the catalog. Click "Add to
  cart".
- *Expected result:* The button's label changes to reflect the item was
  added, and the header's "Cart" link count increases by 1 over its value
  before the click.

**TC1.5 — Cart total matches the line items**
- *Preconditions:* Logged in as Steve; cart contains at least one item added
  via TC1.4 (note that product's listed price beforehand).
- *Steps:* Navigate to `/cart`.
- *Expected result:* The line's shown price times its quantity equals the
  line total shown, and the "Subtotal" in the order summary equals the sum of
  all line totals on the page.

---

## Flow 2 — Cart & Coupon Management (Tier 2 / 4–6 years)

**Journey:** Starting from a cart with more than one product line → adjust a
line's quantity and remove another line, using controls that repeat per line
→ apply a promo code, replace it with a different one, then remove it,
confirming the total recalculates each time → submit the checkout page's
shipping and prescription form.

### Test cases

**TC2.1 — Quantity control is scoped to its own line**
- *Preconditions:* Logged in as Steve; cart has at least two different
  product lines.
- *Steps:* On `/cart`, use the "Increase quantity of {product name}" control
  for one specific line only.
- *Expected result:* Only that line's quantity and line total increase; every
  other line's quantity and line total is unchanged.

**TC2.2 — Removing one line does not affect the others**
- *Preconditions:* Logged in as Steve; cart has at least two different
  product lines.
- *Steps:* Use the "Remove {product name} from cart" control for one specific
  line, then confirm the removal when prompted.
- *Expected result:* Only the targeted line disappears from the cart; the
  remaining line(s) are still present with their original quantities, and the
  "Subtotal" recalculates to match what's left.

**TC2.3 — Applying a promo code recalculates the total**
- *Preconditions:* Logged in as Steve; cart has a subtotal of at least $0
  (no minimum required), no coupon currently applied.
- *Steps:* In the "Coupon code" field, enter `SAVE10` and click "Apply".
- *Expected result:* A "Discount (SAVE10)" line appears in the order summary,
  and the "Total" is reduced by exactly 10% of the subtotal (compare the
  total before and after the wait for the page to refresh).

**TC2.4 — Replacing an applied coupon with a different one**
- *Preconditions:* Logged in as Steve; `SAVE10` is already applied (from
  TC2.3) and the cart subtotal is at least $25.
- *Steps:* Remove the currently-applied `SAVE10` coupon using its "Remove
  coupon SAVE10" control. Once the coupon input reappears, enter `WELCOME5`
  and click "Apply".
- *Expected result:* The order summary now shows a "Discount (WELCOME5)" line
  instead of the SAVE10 discount, and the "Total" reflects the flat $5
  discount rather than the 10% discount.

**TC2.5 — Removing a coupon restores the pre-discount total**
- *Preconditions:* Logged in as Steve; a coupon is currently applied to the
  cart (note the discounted "Total" beforehand).
- *Steps:* Click the "Remove coupon {code}" control.
- *Expected result:* The discount line disappears from the order summary, and
  the "Total" returns to the value it would show with no discount applied
  (subtotal plus tax, no discount subtracted).

**TC2.6 — Checkout submit button shows a pending state**
- *Preconditions:* Logged in as Steve; cart is non-empty; on `/checkout` with
  the shipping fields filled in with valid values (and prescription fields
  filled in if any cart item requires a prescription).
- *Steps:* Click "Place order" and immediately observe the button, before the
  page navigates away.
- *Expected result:* The button becomes disabled and its label changes to
  "Placing order…" while the order is being submitted, then the page
  navigates to the new order's confirmation once it completes.

**TC2.7 — Checkout validates required shipping fields before submitting**
- *Preconditions:* Logged in as Steve; cart is non-empty; on `/checkout` with
  the "Street address" field left blank.
- *Steps:* Click "Place order".
- *Expected result:* An error message is shown identifying the missing
  field, the order is not placed, and the page does not navigate away.

---

## Flow 3 — Account & Order-History Verification (Tier 3 / 6+ years)

**Journey:** Update the saved address and insurance details on `/account` →
place an order (continuing from a Flow-2-style cart) using the updated
details → open that order's detail page from `/orders` → cross-verify that
the shipping and insurance data shown on the order matches what was entered
on `/account` and at checkout.

### Test cases

**TC3.1 — Editing the saved address updates the displayed values**
- *Preconditions:* Logged in as Steve; on `/account` with an existing saved
  address visible under "Saved addresses".
- *Steps:* Click the "Edit {address label} address" control for the existing
  address. Change the "City" field to a new value and click "Save".
- *Expected result:* The saved address section, once out of edit mode, shows
  the new city value; the edit form is no longer shown.

**TC3.2 — Editing insurance updates the displayed values**
- *Preconditions:* Logged in as Steve; on `/account` with existing insurance
  details visible under "Insurance".
- *Steps:* Click the "Edit" control in the Insurance section. Change the
  "Member ID" field to a new value and click "Save".
- *Expected result:* The Insurance section, once out of edit mode, shows the
  new member ID value.

**TC3.3 — Positional disambiguation between address and insurance edit controls**
- *Preconditions:* Logged in as Steve; on `/account` with both a saved
  address and insurance details visible.
- *Steps:* Locate the "Edit" control that belongs to the Insurance section
  specifically (not the address section's "Edit {label} address" control,
  which has a different accessible name but sits in a visually similar card).
- *Expected result:* Only the Insurance section enters edit mode; the address
  section is unaffected.

**TC3.4 — Order placed with updated details carries them into checkout**
- *Preconditions:* Logged in as Steve; address and insurance updated per
  TC3.1/TC3.2; cart contains at least one product.
- *Steps:* Navigate to `/checkout`. Observe the shipping fields.
- *Expected result:* The "Full name", "Street address", "City", and other
  shipping fields are pre-filled consistent with the account's current saved
  address (or blank/editable if the checkout form does not pre-fill from the
  account — either way, fill them to match the updated `/account` values and
  submit).

**TC3.5 — Newly placed order appears at the top of order history**
- *Preconditions:* Logged in as Steve; an order was just placed via TC3.4.
- *Steps:* Navigate to `/orders`.
- *Expected result:* The most recently placed order appears as the first
  item in the list, showing a status badge, item count, and total.

**TC3.6 — Order detail page shows the same shipping data entered on /account**
- *Preconditions:* Logged in as Steve; the order from TC3.4/TC3.5 exists;
  note the exact street, city, region, and postal code entered on `/account`
  in TC3.1.
- *Steps:* From `/orders`, click into the newly placed order to open its
  detail page.
- *Expected result:* The "Shipping address" section on the order detail page
  shows the exact same street, city, region, and postal code that were
  entered on `/account`/at checkout — no field differs.

**TC3.7 — List-to-detail navigation lands on the correct order**
- *Preconditions:* Logged in as Steve; order history contains more than one
  order (the pre-seeded order plus the one just placed).
- *Steps:* On `/orders`, click on a specific order's row (identify it by its
  order ID and total, not by row position alone).
- *Expected result:* The detail page that opens shows the same order ID,
  status, items, and total that were shown for that row on the list page —
  not a different order's data.
