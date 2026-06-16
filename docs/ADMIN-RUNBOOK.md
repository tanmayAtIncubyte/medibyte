# MediByte — Admin / Reviewer Config Runbook

> ⚠️ **PRIVATE — reviewer only. Internal, not candidate-facing.**
> This runbook is for the assessment reviewer who configures and grades a MediByte
> QA assessment. It tells you **which bug flag to turn on and exactly what each one
> does**, so you can build an assessment and grade against ground truth.
>
> Treat this with the **same sensitivity as the answer key** (`docs/ANSWER-KEY.md`).
> It reveals every seeded defect and how to spot it. Never share it — or any part
> of it — with a candidate. It is internal documentation only and is not shipped in
> any candidate-facing build.

---

## 1. Purpose

MediByte is a deliberately-buggy pharmacy storefront used to assess QA candidates.
Every defect is a **toggleable flag**:

- The **admin** always sees the **clean, correct app** plus a **bug-control panel**.
- A **customer** sees a bug **only when that bug's flag is turned ON**.

You (the reviewer) pick a set of flags to enable, hand the candidate a URL + brief,
and grade what they find against this runbook and the live admin reference.

The canonical list of flags lives in `lib/bug-registry.ts`; per-bug repro detail
lives in `docs/ANSWER-KEY.md`. This runbook is the operator's view of both.

---

## 2. How to operate

### Logins
| Role | Email | Password | Sees |
|---|---|---|---|
| Admin / reviewer | `admin@medibyte.test` | `admin1234` | Clean app + bug-control panel at `/admin` |
| Customer (test) | `dana@example.test` | `dana1234` | Bugs whose flags are ON |
| Customer (test) | `omar@example.test` | `omar1234` | Bugs whose flags are ON |

Candidates **self-register** their own customer accounts; the two seeded customers
above are for your own verification.

### The control panel
- Log in as admin and go to **`/admin`**.
- Each registered flag has a toggle. Turning it **ON** enables that bug for customer
  logins; turning it **OFF** restores correct behavior for everyone.
- **Persistence:** toggles are written to **`data/bug-flags.json`** (all keys default
  to `false`). The file is the live source of truth for which bugs are active.
- **Reset to defaults** = every flag OFF (clean app).

### The one rule that matters
> **Admin always sees the clean app. Bugs only manifest for customer logins.**
> If you're verifying a bug and don't see it, confirm you're logged in as a
> **customer** (`dana@example.test`), not as admin. This is enforced server-side by
> `isBugActive(key, user)` — the buggy branch never runs for admin.

### Deploy-time-flags caveat (free host)
Live in-panel toggling works in **local dev**. On the **deployed** free-host instance
the active flag set is effectively **fixed at deploy time** — the set of enabled bugs
is baked in when the instance is built. To change the bug set on the deployed
instance, redeploy with the desired `data/bug-flags.json`. Plan each candidate's
assessment around a deploy (or run assessments locally where you can toggle live).

---

## 3. How to configure an assessment

1. **Choose a profile** — decide which bugs this candidate should face (see example
   profiles below). Aim for a mix of difficulties and at least a couple of categories.
2. **Enable the flags** — local: toggle them ON in `/admin`. Deployed: set them to
   `true` in `data/bug-flags.json` and deploy.
3. **Share the URL + a candidate brief** (the brief is candidate-facing and must NOT
   reference flags, keys, or this runbook — describe the app and the task only).
4. Candidate **self-registers** a customer account and works the app.
5. **Grade** their bug reports against this runbook + the answer key, using your own
   **admin login as the live "correct" reference** (clean app side-by-side).

### Example profiles

**"Junior / balanced" (eyeball + light DevTools, ~6–8 flags)**
A spread of easy/moderate functional + one a11y + one UX, all spottable by careful
manual testing:
`FN_PRICE_DECIMALS`, `FN_PRICE_SORT_LEXICAL`, `FN_INSTOCK_AT_ZERO`,
`FN_CART_BADGE_LINES`, `FN_EXPIRED_COUPON_OK`, `A11Y_LOW_CONTRAST`,
`UX_VAGUE_ERROR`, `FN_NORESULTS_BLANK`.

**"Senior / security-heavy" (DevTools, concurrency, HIPAA, ~7–9 flags)**
Requires Network inspection, edge inputs, and HIPAA reasoning:
`SEC_IDOR_ORDER`, `SEC_PHI_OVERFETCH` (the chained pair),
`SEC_PRICE_TAMPER`, `SEC_CREDS_IN_URL`, `FN_OVERSELL`,
`FN_CONCURRENT_DOUBLESPEND`, `FN_TAX_BEFORE_DISCOUNT`, `FN_TOTAL_ROUNDING_EDGE`.

> Tip: don't enable everything at once. A focused set (one or two categories) gives a
> cleaner read on the candidate than 45 simultaneous defects.

---

## 4. The flag reference

All flags are listed below, **grouped by category**. Columns:

- **Flag key** — the toggle in `/admin` / `data/bug-flags.json`.
- **Diff** — difficulty (E easy / M moderate / D difficult / X expert).
- **What it does (ON)** — the customer-visible effect.
- **Where** — route/screen to observe it.
- **How to spot** — the technique (eyeball / edge input / Network / a11y tool /
  keyboard / arithmetic / code).
- **HIPAA** — whether the defect is a HIPAA/PHI concern.

> Entries marked **🔧 per spec — confirm after verification** are from Batches 5 & 6,
> which were still being built when this runbook was written; their detailed
> answer-key entries may not exist yet, so the described behavior is from the spec and
> should be confirmed once those bugs are implemented and verified.

### 4.1 Functional

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `FN_PRICE_DECIMALS` | E | Prices render with one decimal, no cent rounding (`$10.49` → `$10.5`). | `/products`, `/products/[id]` | Eyeball price strings | No |
| `FN_PRICE_SORT_LEXICAL` | E | "Price: Low→High" sorts prices as strings, so `$10` lands before `$3`. | `/products` (sort) | Eyeball post-sort ordering | No |
| `FN_PAGINATION_OFFBYONE` | E | Page window start shifted +1: first product dropped, each boundary skips one. | `/products` (page nav) | Cross-screen: missing first item; count vs items shown disagree | No |
| `FN_CART_BADGE_LINES` | E | Header cart badge counts distinct lines, not total qty (qty 3 → badge 1). | Header / `/cart` | Cross-screen: badge vs "Subtotal (N items)" disagree | No |
| `FN_INSTOCK_AT_ZERO` | E | Shows "In stock" on a 0-stock item ("Daily Fiber Supplement Powder"). | `/products`, `/products/[id]` | Eyeball availability pill on a known OOS item | No |
| `FN_NORESULTS_BLANK` | E | Empty search shows a blank area, no empty-state / "Clear filters" guidance. | `/products` (search "zzzzz") | Eyeball empty results | No |
| `FN_ORDER_DATE_RAW` | E | Order date shown as raw ISO (`2026-01-15T09:30:00.000Z`) not "Jan 15, 2026". | `/orders` | Eyeball order list date | No |
| `FN_TRIPWIRE_COPY` ⭐ | E | Description sentence **contradicts the Rx/OTC badge** (Rx item claims "no prescription needed", OTC claims "prescription required"). | `/products/[id]` | **Careful reading** — copy vs badge/Rx note | No |
| `FN_QTY_NONPOSITIVE` | M | Cart PATCH persists qty 0 / negative instead of removing the line (API state disagrees with the displayed cart). | `/cart` stepper / `PATCH /api/session/cart` | **DevTools Network only** — inspect PATCH response `items` for `quantity: 0` | No |
| `FN_CART_TOTAL_STALE` | M | After changing the first line's qty, Subtotal updates but Total stays computed as if that line were qty 1. | `/cart` | Arithmetic / cross-screen: Subtotal ≠ Total math | No |
| `FN_TAX_FLOOR` | M | Tax floored to cents instead of rounded ($0.8056 → $0.80 not $0.81). | `/cart`, `/checkout`, `/api/checkout` | Arithmetic: recompute `base × 0.08`, off a cent down | No |
| `FN_EXPIRED_COUPON_OK` | M | Expired coupon `SPRING2023` (exp 2023-05-31) is accepted and discounts. | `/cart` coupon form | Edge input: apply known-expired code, watch discount appear | No |
| `FN_OOS_ADDABLE` | M | Out-of-stock item (`prod-fiber-supplement`, stock 0) can be added (201 instead of 409). | `POST /api/session/cart` | DevTools Network / workaround disabled button | No |
| `FN_POSTAL_UNVALIDATED` | M | Server skips the required-postal-code check; order accepted with blank postal code. | `/api/checkout` (server validation) | Edge input: submit checkout with postal blank | No |
| `FN_TAX_BEFORE_DISCOUNT` | D | Tax computed on **pre-discount** subtotal → customer overcharged the tax on the discounted amount. | `/cart`, `/checkout`, `/api/checkout` (coupon applied) | Arithmetic: Tax ÷ (Subtotal − Discount) ≠ 8% | No |
| `FN_COUPON_NEGATIVE` | D | Discount not clamped to subtotal → **negative total**. Repro: apply `MEGA50` ($50 off, no min) to a ~$7 cart (one Ibuprofen 200) → total goes negative; OFF it floors at $0. | `/cart`, `/checkout`, `/api/checkout` | Edge input: apply `MEGA50` to a ~$7 cart | No |
| `FN_FILTER_LOST_ON_PAGE` | D | Page links built from empty base → paginating **drops the active filter/search**. | `/products` (filter then page) | Cross-screen: click page 2 with filter active, filter vanishes from URL/results | No |
| `FN_PAGE_COUNT_UNFILTERED` | D | "Showing N of M" and pager count the **full catalog** while the grid shows only the filtered slice; trailing pages render empty. | `/products` (filtered set) | Cross-screen: "of N" count + pager buttons vs items shown | No |
| `FN_OVERSELL` † | D | Atomic stock check skipped → order placed for more than is in stock (e.g. 20 vs stock 8), driving availability negative. | `/api/checkout` (low-stock item) | Edge input / Network: clean 409 vs buggy 201; check stock after | No |
| `FN_CONCURRENT_DOUBLESPEND` † | X | Racy reservation snapshots availability, waits a real ~300ms window, then commits on the stale snapshot → two near-simultaneous orders for the last units **both succeed** (double-spend). Repro: rapidly double-submit `POST /api/checkout` (or double-click Place order) for the last units. Also by code review. | `/api/checkout` (rapid double-submit) | Concurrency: fire two checkouts in quick succession for the last units, both succeed | No |
| `FN_TOTAL_ROUNDING_EDGE` | X | Taxed base built from the **unrounded** discount → total off a cent only at specific subtotal+coupon combos (e.g. $1.05 + 10% → $1.03 not $1.02). Most carts compute correctly. | `/cart`, `/checkout`, `/api/checkout` | Arithmetic: recompute with rounded discount; only edge values differ. Easy to miss. | No |
| `FN_PARTIAL_CHECKOUT` | X | Order persisted but `clearCart` skipped → cart stays full after a successful order (duplicate-purchase trap, inconsistent state). | `/cart`, `/orders`, header after checkout | Cross-screen: order shows in `/orders` but `/cart` still full / badge non-zero | No |

> **† Stock baseline:** Batch 2 added the correct atomic stock ledger
> (`lib/data/stock-store.ts` + `lib/orders/place-order.ts`) behind **no flag** —
> reservations are atomic and all-or-nothing, and the ledger **resets on server
> restart**. `FN_OVERSELL` and `FN_CONCURRENT_DOUBLESPEND` toggle that correct
> behavior off. After a stock-bug repro you may want to restart the server to reset
> availability.

### 4.2 Accessibility

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `A11Y_INPUT_NO_LABEL` | E | "Coupon code" input loses its `<label>` and gets no `aria-label` → **no accessible name** (placeholder doesn't count). | `/cart` (Order summary, cart has ≥1 item) | **a11y tree / screen reader** (announces "edit text"); axe `label` rule. ⚠️ NOT reliably caught by Lighthouse's visible-label score — verify via the accessibility tree / SR. | No |
| `A11Y_LOW_CONTRAST` | E | Catalog price uses `text-muted-foreground/40` — below WCAG AA 4.5:1 for normal text. | `/products` (card price) | a11y tool: axe/Lighthouse `color-contrast`; also eyeball barely-legible price | No |
| `A11Y_NO_KEYBOARD_FOCUS` | M | Qty steppers render as plain `<span>` (onClick only, no role/tabIndex, `outline:none`) → not tabbable, not keyboard-operable, no focus ring. Mouse still works (masks it). | `/cart` (qty steppers) | **Keyboard**: Tab to steppers (skipped) + Enter/Space (no-op); axe flags missing interactive semantics | No |

### 4.3 Performance / Latency (all simulated)

> All performance defects are **simulated** injected delays / payload bloat / extra
> requests. They never affect correctness; spotting them is a **DevTools
> Network/Performance** task.

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `PERF_SLOW_CHECKOUT` | M | `POST /api/checkout` stalls ~2s with no pending feedback — submit button just looks dead. | `/checkout` submit | DevTools Network: ~2s TTFB on `/api/checkout`, no on-screen wait cue | No |
| `PERF_PRODUCTS_TTFB` | M | Products page blocks ~1.5s server-side before any HTML; blank tab, no skeleton, then sudden render. | `/products` (navigation) | DevTools Network/Performance: ~1.5s TTFB on the `/products` document | No |
| `PERF_CART_WATERFALL` | D | Client island re-fetches every line's product **sequentially** (`GET /api/products/[id]` per line, N+1) though data is already present; results discarded. | `/cart` (several distinct lines) | DevTools Network: staircase waterfall of per-item `/api/products/<id>` (client XHR/fetch) | No |
| `PERF_OVERFETCH_PAYLOAD` | M | `GET /api/products` bloats each item with large unused/duplicated fields (`_raw`, `_duplicate`, `_description_long`, `_seoKeywords[100]`, `_auditTrail[50]`). | `GET /api/products` | DevTools Network: response **Size** far larger than needed; inspect payload | No |
| `PERF_NO_CACHE` | M | `GET /api/products` forces `Cache-Control: no-store` → full catalog refetched on every navigation. | `/api/products` (repeat nav) | DevTools Network: `no-store` header; request repeats, never "from cache" | No |

### 4.4 Security / Transport (HIPAA) — 🔧 per spec — confirm after verification

> Batch 5 was still being built when this runbook was written. Behavior below is from
> the spec (`docs/specs/medibyte-phase-4-spec.md`); confirm against the answer key and
> a live toggle once implemented.

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `SEC_IDOR_ORDER` 🔗 | — | Ownership check dropped on the order route → a customer can view **another customer's order** by guessing/altering the order id. | `/orders/[id]` + API | Edit the order id in the URL/request and load someone else's order; compare to admin-clean (403/own-only) | **Yes** |
| `SEC_PHI_OVERFETCH` 🔗 | — | Orders/account API response includes **PHI the page doesn't need**. Chains with IDOR: an id leaked via `SEC_IDOR_ORDER` reused here exposes extra PHI. | Orders / account API | DevTools Network: inspect response body for PHI fields not rendered | **Yes** |
| `SEC_MISSING_ADMIN_AUTH` | — | Admin guard removed on the bug-flags endpoint → a non-admin can read/modify flags. | `/api/admin/bug-flags` | Call the endpoint as a customer (or unauthenticated) and get a non-403 response | **Yes** |
| `SEC_CREDS_IN_URL` | — | Login sends credentials via **GET query string** → password leaks into URL/history/logs. | Login | DevTools Network: credentials visible in the request URL/query string | **Yes** |
| `SEC_TOKEN_LOCALSTORAGE` | — | Auth identity/token copied into **`localStorage`** (XSS-exfiltratable, not httpOnly). | Client auth | DevTools Application → Local Storage: identity/token present | **Yes** |
| `SEC_PRICE_TAMPER` | — | Checkout **trusts the client-supplied price** instead of recomputing server-side → tampered request pays a manipulated amount. | `/api/checkout` | Edit the price in the checkout request and confirm the order honors it | **Yes** |

### 4.5 UI antipattern — 🔧 per spec — confirm after verification

> Batch 6 was still being built when this runbook was written. Behavior is from the
> spec; confirm after verification.

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `UI_DESTRUCTIVE_NO_CONFIRM` | — | Destructive action (remove cart item / delete address) executes instantly with **no confirmation**. | `/cart` remove, address delete | Eyeball: irreversible action with no confirm dialog/undo | No |
| `UI_NO_SUBMIT_FEEDBACK` | — | A form submit gives **no visible feedback** (no spinner/disable/success). | A form | Eyeball: submit and observe nothing changes/confirms | No |
| `UI_MISLEADING_ICON` | — | A button's **icon doesn't match its action**. | A button | Eyeball: icon vs actual behavior mismatch | No |
| `UI_FORM_CLEARS_ON_ERROR` | — | A checkout validation error **wipes the entered fields**, forcing full re-entry. | `/checkout` | Edge input: trigger a validation error, watch fields clear | No |

### 4.6 UX — 🔧 per spec — confirm after verification

> Batch 6 was still being built when this runbook was written. Behavior is from the
> spec; confirm after verification.

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `UX_VAGUE_ERROR` | — | A catch handler shows "Something went wrong" with **no next step / cause**. | A catch handler | Eyeball: trigger the error path, read the unhelpful message | No |
| `UX_NO_ORDER_CONFIRM` | — | Order confirmation gives **no clear success cue** — unclear the order placed. | Order confirmation | Eyeball: complete an order, look for missing success confirmation | No |
| `UX_SURPRISE_TAX` | — | Tax is **hidden until the final checkout step** (not shown in cart). | `/cart` vs `/checkout` | Cross-screen: cart total vs final total, tax appears late | No |
| `UX_LOST_CHECKOUT_PROGRESS` | — | **Back navigation loses entered checkout data.** | `/checkout` (back nav) | Manual: fill checkout, navigate back, data gone | No |
| `UX_NO_PAGE_TOTAL` | — | No indication of **total pages / total results** in the catalog pager. | `/products` pager | Eyeball: pager shows no "of N pages" / total count | No |

---

## 5. Special notes

- **⭐ Reading tripwire — `FN_TRIPWIRE_COPY`.** This one is *only* caught by reading
  carefully: the product description sentence directly contradicts the Rx/OTC badge
  above it. It's there to test whether a candidate actually reads content rather than
  just clicking through. No tool flags it.

- **🔗 Chained bug — `SEC_IDOR_ORDER` → `SEC_PHI_OVERFETCH`.** These are designed to
  combine. `SEC_IDOR_ORDER` lets a customer reach another customer's order by id;
  `SEC_PHI_OVERFETCH` makes that response (and the account/orders API generally) leak
  PHI the page never needed. Enabling **both** demonstrates the full exploit: leak an
  order id via IDOR, reuse it to over-fetch another patient's PHI. Both are HIPAA
  concerns. (Per spec — confirm after verification.)

- **Tool-specific symptoms — won't show by eyeballing:**
  - **`FN_QTY_NONPOSITIVE` is Network-only.** The displayed cart drops non-positive
    lines, so the bug is only visible in the **`PATCH /api/session/cart` response**
    (`items` retains a `quantity: 0`/negative line). Eyeballing the cart page hides it.
  - **`A11Y_INPUT_NO_LABEL` — use the screen reader / accessibility tree, NOT
    Lighthouse's visible-label score.** The input still has a visible placeholder, so
    a quick Lighthouse pass can read as "fine." Confirm the missing accessible name via
    the a11y tree or a screen reader (announces just "edit text"); axe's `label` rule
    is the reliable automated check.
  - **All `PERF_*` flags need DevTools Network/Performance** — they're simulated
    delays/payload/extra-request patterns with no functional change, so they only show
    in timing, response size, and the request waterfall.
  - **`SEC_PRICE_TAMPER`, `SEC_CREDS_IN_URL`, `SEC_TOKEN_LOCALSTORAGE`** require
    DevTools (Network request body/URL, Application → Local Storage) — not visible in
    the UI.

- **Difficulty (`—`) for Batch 5/6 flags** is left blank pending the answer-key
  entries; assign and confirm difficulty once those bugs are verified.

---

*Source of truth: `lib/bug-registry.ts` (flags) + `docs/ANSWER-KEY.md` (per-bug repro).
This runbook covers all ~45 flags; Batch 5 (Security) and Batch 6 (UI/UX) rows are
marked "per spec — confirm after verification" until their bugs are built and verified.*
