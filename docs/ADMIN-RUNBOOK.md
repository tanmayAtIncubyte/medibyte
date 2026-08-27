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
Every defect is a **flag**:

- The **admin** always sees the **clean, correct app** plus a read-only **bug reference**.
- A **customer** sees a bug **only when that bug's flag is ON** (the deploy runs with all 45 ON).

You (the reviewer) set which flags are on in `data/bug-flags.json`, hand the
candidate a **time-boxed access link** + brief, and grade what they find against
this runbook and the live admin reference.

The canonical list of flags lives in `lib/bug-registry.ts`; per-bug repro detail
lives in `docs/ANSWER-KEY.md`. This runbook is the operator's view of both.

---

## 2. How to operate

### Logins
| Role | Email | Password | Sees |
|---|---|---|---|
| Admin / reviewer | `admin@medibyte.test` | `admin.incu123` | Clean app + bug-control panel at `/admin` |
| Customer (test) | `dana@example.test` | `dana1234` | Bugs whose flags are ON |
| Customer (test) | `omar@example.test` | `omar1234` | Bugs whose flags are ON |
| QA automation (test) | `steve@example.test` | `steve1234` | Clean app, same as admin, but **no** `/admin` or `/api/admin/bug-flags` access |

Candidates sign in with a seeded customer login (given in their brief) — each
candidate's `/start` link isolates their state, so sharing a seeded login across
candidates is safe. Self-registration is hidden from the UI (the `/register`
route + code are kept for future use). The seeded customers are also for your
own verification.

### The bug reference (`/admin`)
- Log in as admin and go to **`/admin`**.
- The page is a **read-only reference** of all 45 seeded bugs: filter by category /
  difficulty, open the ⓘ info popover (effect, where, how to spot), and open the
  **Preview** modal for annotated Buggy-vs-Clean screenshots. There is **no toggle
  UI** — flags are not changed from the panel.
- **Source of truth:** which bugs are active is read from **`data/bug-flags.json`**
  at request time. The committed file is the **deploy profile — currently all 45
  flags ON**. Every candidate faces the full set.
- To change the active set, **edit `data/bug-flags.json`** (and redeploy for the
  hosted instance). The admin-guarded `/api/admin/bug-flags` endpoint also still
  accepts programmatic reads/writes in local dev.

### Candidate access — time-boxed links (`/admin/candidates`)
Candidates don't get the bare URL; you mint each one a **personal, time-boxed
access link** on a **persistent roster**. This also fixes the deploy so their
cart/orders actually persist (see "Why the link matters" below).

- Go to **`/admin/candidates`** (linked from `/admin`, and from the **Candidates**
  nav item shown to admins).
- **Create** a link: enter the candidate's **name**, **email** (required — your
  unique identifier for the roster), an optional **role** and **internal notes**
  (reviewer-only, never shown to the candidate), and a **window** in days
  (default **10**). Windows accept **fractions** — `0.5` = 12h, `0.25` = 6h. Click
  **Create access link**, then **Copy link** (`https://…/start?code=<code>`) and
  send it to the candidate. **Duplicate email is blocked** — if that email is
  already on the roster, mint fails (409); re-grant or remove the existing entry
  instead.
- The candidate opens the link once; it drops a cookie and lands them on `/login`
  to register/sign in. Everything they do lives in an isolated `cand:<code>`
  namespace.
- The table shows each candidate's email/role plus:
  - **Status** — **Active**, **Revoked**, or **Expired**, with the current
    **Attempt N** (a returning/re-granted candidate reads as Attempt 2, 3, …).
  - **Access until** — the current window's expiry date/time and the remaining
    time (or how long ago it lapsed).
  - **History** — a per-candidate log of attempts (each grant, when they started,
    any revoke), so you can see the candidate's full access story.
  - the code, the copy-link button, and the lifecycle actions below.
- **Lifecycle actions** (all keep the candidate on the roster except Remove):
  - **Revoke** — locks them out **immediately** on their next request. It's
    **reversible**: the candidate stays listed as **Revoked** (not deleted).
  - **Re-grant** — brings a revoked/expired candidate back as a **new attempt**
    with a fresh, typed window (fractions OK). Their prior work **resumes** if it's
    still within the state retention window.
  - **Extend** — pushes the current window's expiry out by the extra days.
  - **Remove** — **permanently deletes** the roster entry and purges all their
    state; this **frees the email** for reuse. Use it when you truly want them gone.
- **Auto-expiry:** when the window lapses the candidate reads as **Expired** and
  the next page load shows **`/closed`** — but the roster entry **remains** and can
  be re-granted. You (admin) never need a code — your admin session always passes
  the gate.

> **Why the link matters (not optional on the deploy):** Vercel is serverless, so
> in-memory state doesn't survive between requests — without the Redis-backed
> candidate namespace, add-to-cart would return 201 but the cart would render empty,
> killing every cart/checkout/order bug. The access link *is* the persistence
> mechanism. Requires the Upstash env vars (see §7); with no Redis env the gate is
> **disabled** (local dev / demos are unaffected and need no link).

### The one rule that matters
> **Admin and Steve (`qa_automation`) always see the clean app. Bugs only manifest for
> customer logins.** If you're verifying a bug and don't see it, confirm you're logged
> in as a **customer** (`dana@example.test`), not as admin or Steve. This is enforced
> server-side by `isBugActive(key, user)` — the buggy branch never runs for admin or
> `qa_automation`. Steve is for the automation-QA track only and has no `/admin` access.

### Deploy-time flags (Vercel)
The deployed instance runs on Vercel, whose filesystem is **read-only** — the
active flag set is **fixed at deploy time**, baked in from the committed
`data/bug-flags.json` (currently all 45 ON). To change the bug set on the
deployed instance, edit the file, commit, and redeploy.

---

## 3. How to configure an assessment

1. **Choose a profile** — the default deploy profile is **all 45 flags ON** (every
   candidate faces the full set). If you want a narrower set (see example profiles
   below), aim for a mix of difficulties and at least a couple of categories.
2. **Set the flags** — edit `data/bug-flags.json` (`true`/`false` per key) and, for
   the deployed instance, commit + redeploy. There is no toggle UI.
3. **Mint an access link** at `/admin/candidates` and send it, with a candidate
   brief (the brief is candidate-facing and must NOT reference flags, keys, or this
   runbook — describe the app and the task only). On local dev (no Redis) just share
   the URL — no link needed.
4. Candidate opens the link and signs in with the seeded customer login (the
   self-register link is hidden), then works the app.
5. **Grade** their bug reports against this runbook + the answer key, using your own
   **admin login as the live "correct" reference** (clean app side-by-side).
6. When done, **Revoke** the link (or let it expire).

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

- **Flag key** — the key in `data/bug-flags.json` (and in the `/admin` reference list).
- **Diff** — difficulty (E easy / M moderate / D difficult / X expert).
- **What it does (ON)** — the customer-visible effect.
- **Where** — route/screen to observe it.
- **How to spot** — the technique (eyeball / edge input / Network / a11y tool /
  keyboard / arithmetic / code).
- **HIPAA** — whether the defect is a HIPAA/PHI concern.

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

### 4.4 Security / Transport (HIPAA)

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `SEC_IDOR_ORDER` 🔗 | D | Ownership check dropped on the order route → a customer can view **another customer's order** by guessing/altering the order id. | `/orders/[id]` + API | Edit the order id in the URL/request and load someone else's order; compare to admin-clean (403/own-only) | **Yes** |
| `SEC_PHI_OVERFETCH` 🔗 | D | Orders/account API response includes **PHI the page doesn't need**. Chains with IDOR: an id leaked via `SEC_IDOR_ORDER` reused here exposes extra PHI. | Orders / account API | DevTools Network: inspect response body for PHI fields not rendered | **Yes** |
| `SEC_MISSING_ADMIN_AUTH` | D | Admin guard removed on the bug-flags endpoint → a non-admin can read/modify flags. | `/api/admin/bug-flags` | Call the endpoint as a customer (or unauthenticated) and get a non-403 response | **Yes** |
| `SEC_CREDS_IN_URL` | M | Login sends credentials via **GET query string** → password leaks into URL/history/logs. | Login | DevTools Network: credentials visible in the request URL/query string | **Yes** |
| `SEC_TOKEN_LOCALSTORAGE` | M | Auth identity/token copied into **`localStorage`** (XSS-exfiltratable, not httpOnly). | Client auth | DevTools Application → Local Storage: identity/token present | **Yes** |
| `SEC_PRICE_TAMPER` | D | Checkout **trusts the client-supplied price** instead of recomputing server-side → tampered request pays a manipulated amount. | `/api/checkout` | Edit the price in the checkout request and confirm the order honors it | **Yes** |

### 4.5 UI antipattern

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `UI_DESTRUCTIVE_NO_CONFIRM` | E | Destructive action (remove cart item / delete address) executes instantly with **no confirmation**. | `/cart` remove, address delete | Eyeball: irreversible action with no confirm dialog/undo | No |
| `UI_NO_SUBMIT_FEEDBACK` | E | A form submit gives **no visible feedback** (no spinner/disable/success). | A form | Eyeball: submit and observe nothing changes/confirms | No |
| `UI_MISLEADING_ICON` | E | A button's **icon doesn't match its action**. | A button | Eyeball: icon vs actual behavior mismatch | No |
| `UI_FORM_CLEARS_ON_ERROR` | M | A checkout validation error **wipes the entered fields**, forcing full re-entry. | `/checkout` | Edge input: trigger a validation error, watch fields clear | No |

### 4.6 UX

| Flag key | Diff | What it does (ON) | Where | How to spot | HIPAA |
|---|---|---|---|---|---|
| `UX_VAGUE_ERROR` | E | A catch handler shows "Something went wrong" with **no next step / cause**. | A catch handler | Eyeball: trigger the error path, read the unhelpful message | No |
| `UX_NO_ORDER_CONFIRM` | E | Order confirmation gives **no clear success cue** — unclear the order placed. | Order confirmation | Eyeball: complete an order, look for missing success confirmation | No |
| `UX_SURPRISE_TAX` | M | Tax is **hidden until the final checkout step** (not shown in cart). | `/cart` vs `/checkout` | Cross-screen: cart total vs final total, tax appears late | No |
| `UX_LOST_CHECKOUT_PROGRESS` | M | **Back navigation loses entered checkout data.** | `/checkout` (back nav) | Manual: fill checkout, navigate back, data gone | No |
| `UX_NO_PAGE_TOTAL` | E | No indication of **total pages / total results** in the catalog pager. | `/products` pager | Eyeball: pager shows no "of N pages" / total count | No |

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

---

## 6. Clean vs buggy reference screenshots

> Annotated clean-vs-buggy screenshots for **every flag**, grouped by category. Each
> **buggy** shot is the customer view (flag ON) with a **thick orange callout box** drawn
> around the exact buggy element plus a short label naming what to look at; each **clean**
> shot is the admin/correct view with a green "correct" callout. Network/header/localStorage/
> timing-only bugs (`PERF_*`, several `SEC_*`, `FN_QTY_NONPOSITIVE`, `FN_OOS_ADDABLE`,
> `FN_CONCURRENT_DOUBLESPEND`) have no on-screen difference, so their callout boxes the
> relevant control/screen and the label says "observe in DevTools" with the captured evidence.
> Files live in `private/bug-shots/<KEY>-buggy.png` / `-clean.png`.

### 6.1 Functional

#### `FN_PRICE_DECIMALS` — Prices render with one decimal / no cent rounding

Prices show one decimal instead of cents (e.g. $10.5 not $10.49).
  
_Where:_ `/products and /products/[id]`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_PRICE_DECIMALS buggy](../private/bug-shots/FN_PRICE_DECIMALS-buggy.png) | ![FN_PRICE_DECIMALS clean](../private/bug-shots/FN_PRICE_DECIMALS-clean.png) |

#### `FN_PRICE_SORT_LEXICAL` — Price sort compares prices as strings (lexical)

Sorting by price orders lexically, so $10 sorts before $3.
  
_Where:_ `/products (sort: Price Low→High / High→Low)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_PRICE_SORT_LEXICAL buggy](../private/bug-shots/FN_PRICE_SORT_LEXICAL-buggy.png) | ![FN_PRICE_SORT_LEXICAL clean](../private/bug-shots/FN_PRICE_SORT_LEXICAL-clean.png) |

#### `FN_PAGINATION_OFFBYONE` — Pagination window skips one item at the page boundary

The first product is dropped and each page boundary skips one item.
  
_Where:_ `/products (paging across pages)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_PAGINATION_OFFBYONE buggy](../private/bug-shots/FN_PAGINATION_OFFBYONE-buggy.png) | ![FN_PAGINATION_OFFBYONE clean](../private/bug-shots/FN_PAGINATION_OFFBYONE-clean.png) |

#### `FN_CART_BADGE_LINES` — Header cart badge counts line items, not total quantity

Cart badge counts distinct lines, not total quantity (qty 3 shows 1).
  
_Where:_ `Site header (badge) vs /cart Subtotal`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_CART_BADGE_LINES buggy](../private/bug-shots/FN_CART_BADGE_LINES-buggy.png) | ![FN_CART_BADGE_LINES clean](../private/bug-shots/FN_CART_BADGE_LINES-clean.png) |

#### `FN_INSTOCK_AT_ZERO` — Shows 'In stock' when stock is zero

A zero-stock product shows 'In stock' instead of 'Out of stock'.
  
_Where:_ `/products + /products/[id] (e.g. Daily Fiber Supplement Powder)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_INSTOCK_AT_ZERO buggy](../private/bug-shots/FN_INSTOCK_AT_ZERO-buggy.png) | ![FN_INSTOCK_AT_ZERO clean](../private/bug-shots/FN_INSTOCK_AT_ZERO-clean.png) |

#### `FN_NORESULTS_BLANK` — No 'no results' message shown on an empty search

An empty search renders a blank area with no guidance or clear-filters link.
  
_Where:_ `/products (search a term that matches nothing, e.g. 'zzzzz')`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_NORESULTS_BLANK buggy](../private/bug-shots/FN_NORESULTS_BLANK-buggy.png) | ![FN_NORESULTS_BLANK clean](../private/bug-shots/FN_NORESULTS_BLANK-clean.png) |

#### `FN_ORDER_DATE_RAW` — Order date shown as a raw ISO timestamp

Order date shows a raw ISO string (2026-01-15T09:30:00.000Z) not a friendly date.
  
_Where:_ `/orders`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_ORDER_DATE_RAW buggy](../private/bug-shots/FN_ORDER_DATE_RAW-buggy.png) | ![FN_ORDER_DATE_RAW clean](../private/bug-shots/FN_ORDER_DATE_RAW-clean.png) |

#### `FN_TRIPWIRE_COPY` — Product detail copy contradicts the Rx/OTC badge (reading tripwire)

An added sentence contradicts the Rx/OTC badge (Rx item claims no Rx needed, etc.).
  
_Where:_ `/products/[id] (description area)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_TRIPWIRE_COPY buggy](../private/bug-shots/FN_TRIPWIRE_COPY-buggy.png) | ![FN_TRIPWIRE_COPY clean](../private/bug-shots/FN_TRIPWIRE_COPY-clean.png) |

#### `FN_QTY_NONPOSITIVE` — Cart quantity stepper accepts zero / negative quantities

PATCH persists a zero/negative quantity instead of removing the line.
  
_Where:_ `/cart (drop a line to 0) — PATCH /api/session/cart`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_QTY_NONPOSITIVE buggy](../private/bug-shots/FN_QTY_NONPOSITIVE-buggy.png) | ![FN_QTY_NONPOSITIVE clean](../private/bug-shots/FN_QTY_NONPOSITIVE-clean.png) |

#### `FN_CART_TOTAL_STALE` — Cart total does not recompute after a quantity change

Total ignores the first line's quantity, so it disagrees with the subtotal.
  
_Where:_ `/cart (raise the first line's quantity, watch Order summary)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_CART_TOTAL_STALE buggy](../private/bug-shots/FN_CART_TOTAL_STALE-buggy.png) | ![FN_CART_TOTAL_STALE clean](../private/bug-shots/FN_CART_TOTAL_STALE-clean.png) |

#### `FN_TAX_FLOOR` — Tax is floored to cents instead of rounded

Tax is floored down a cent (e.g. $0.80 instead of $0.81).
  
_Where:_ `/cart, /checkout (Tax row)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_TAX_FLOOR buggy](../private/bug-shots/FN_TAX_FLOOR-buggy.png) | ![FN_TAX_FLOOR clean](../private/bug-shots/FN_TAX_FLOOR-clean.png) |

#### `FN_EXPIRED_COUPON_OK` — Expired coupon still applies

An expired coupon is accepted and its discount applies.
  
_Where:_ `/cart (apply expired code SPRING2023)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_EXPIRED_COUPON_OK buggy](../private/bug-shots/FN_EXPIRED_COUPON_OK-buggy.png) | ![FN_EXPIRED_COUPON_OK clean](../private/bug-shots/FN_EXPIRED_COUPON_OK-clean.png) |

#### `FN_OOS_ADDABLE` — Out-of-stock item can still be added to the cart

Adding a 0-stock item returns 201 and the item lands in the cart (should be 409).
  
_Where:_ `/products → add a 0-stock item — POST /api/session/cart`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_OOS_ADDABLE buggy](../private/bug-shots/FN_OOS_ADDABLE-buggy.png) | ![FN_OOS_ADDABLE clean](../private/bug-shots/FN_OOS_ADDABLE-clean.png) |

#### `FN_POSTAL_UNVALIDATED` — Postal code skips required-field validation at checkout

Checkout is accepted with a blank postal code (server skips the required check).
  
_Where:_ `/checkout (submit with postal code blank) — POST /api/checkout`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_POSTAL_UNVALIDATED buggy](../private/bug-shots/FN_POSTAL_UNVALIDATED-buggy.png) | ![FN_POSTAL_UNVALIDATED clean](../private/bug-shots/FN_POSTAL_UNVALIDATED-clean.png) |

#### `FN_TAX_BEFORE_DISCOUNT` — Tax computed on the pre-discount subtotal (overcharge)

With a coupon, tax is charged on the pre-discount subtotal, overcharging the customer.
  
_Where:_ `/cart, /checkout (apply a coupon, e.g. SAVE10)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_TAX_BEFORE_DISCOUNT buggy](../private/bug-shots/FN_TAX_BEFORE_DISCOUNT-buggy.png) | ![FN_TAX_BEFORE_DISCOUNT clean](../private/bug-shots/FN_TAX_BEFORE_DISCOUNT-clean.png) |

#### `FN_COUPON_NEGATIVE` — Discount not clamped to subtotal → negative total

Discount is not clamped to subtotal, so the total can go negative. Note: needs a coupon worth more than the cart subtotal to actually observe a negative total; default seed coupons won't trigger it without a reviewer-seeded high-value coupon.
  
_Where:_ `/cart, /checkout (fixed-dollar coupon > subtotal)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_COUPON_NEGATIVE buggy](../private/bug-shots/FN_COUPON_NEGATIVE-buggy.png) | ![FN_COUPON_NEGATIVE clean](../private/bug-shots/FN_COUPON_NEGATIVE-clean.png) |

#### `FN_FILTER_LOST_ON_PAGE` — Paginating drops the active filter/search

Page links drop q/category/type/sort, so paging lands on the unfiltered catalog.
  
_Where:_ `/products (apply a filter, then click Next / page 2)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_FILTER_LOST_ON_PAGE buggy](../private/bug-shots/FN_FILTER_LOST_ON_PAGE-buggy.png) | ![FN_FILTER_LOST_ON_PAGE clean](../private/bug-shots/FN_FILTER_LOST_ON_PAGE-clean.png) |

#### `FN_PAGE_COUNT_UNFILTERED` — Page count / total uses the unfiltered catalog

'Showing N of M' and the pager count the full catalog; later pages render empty.
  
_Where:_ `/products (filter to a small result set)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_PAGE_COUNT_UNFILTERED buggy](../private/bug-shots/FN_PAGE_COUNT_UNFILTERED-buggy.png) | ![FN_PAGE_COUNT_UNFILTERED clean](../private/bug-shots/FN_PAGE_COUNT_UNFILTERED-clean.png) |

#### `FN_OVERSELL` — Order can exceed available stock (no stock check)

Stock check is skipped, so an order for more units than exist still succeeds.
  
_Where:_ `/checkout (order a quantity above stock) — POST /api/checkout`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_OVERSELL buggy](../private/bug-shots/FN_OVERSELL-buggy.png) | ![FN_OVERSELL clean](../private/bug-shots/FN_OVERSELL-clean.png) |

#### `FN_CONCURRENT_DOUBLESPEND` — Concurrent orders double-spend the same stock (lost atomicity)

Two near-simultaneous orders for the last units both succeed (stock double-spent). A ~300ms real race window between check and commit makes it reproducible by rapidly double-submitting checkout; also catchable by code review.
  
_Where:_ `POST /api/checkout (rapid double-submit for the last units)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_CONCURRENT_DOUBLESPEND buggy](../private/bug-shots/FN_CONCURRENT_DOUBLESPEND-buggy.png) | ![FN_CONCURRENT_DOUBLESPEND clean](../private/bug-shots/FN_CONCURRENT_DOUBLESPEND-clean.png) |

#### `FN_TOTAL_ROUNDING_EDGE` — Wrong total only at specific coupon+tax values (rounding-order edge)

Total is off by a cent only at specific subtotal+coupon values; most carts are correct.
  
_Where:_ `/cart, /checkout (edge subtotal + percent coupon)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_TOTAL_ROUNDING_EDGE buggy](../private/bug-shots/FN_TOTAL_ROUNDING_EDGE-buggy.png) | ![FN_TOTAL_ROUNDING_EDGE clean](../private/bug-shots/FN_TOTAL_ROUNDING_EDGE-clean.png) |

#### `FN_PARTIAL_CHECKOUT` — Order created but the cart is not cleared (inconsistent state)

After a successful order, the cart is left full (same items linger), inviting a duplicate buy.
  
_Where:_ `After checkout: /orders shows it but /cart still holds the items`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![FN_PARTIAL_CHECKOUT buggy](../private/bug-shots/FN_PARTIAL_CHECKOUT-buggy.png) | ![FN_PARTIAL_CHECKOUT clean](../private/bug-shots/FN_PARTIAL_CHECKOUT-clean.png) |

### 6.2 Accessibility

#### `A11Y_INPUT_NO_LABEL` — Coupon code input loses its programmatic label (no accessible name)

Coupon input has no accessible name (label removed, no aria-label) — axe 'label' rule.
  
_Where:_ `/cart (Coupon code input in Order summary)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![A11Y_INPUT_NO_LABEL buggy](../private/bug-shots/A11Y_INPUT_NO_LABEL-buggy.png) | ![A11Y_INPUT_NO_LABEL clean](../private/bug-shots/A11Y_INPUT_NO_LABEL-clean.png) |

#### `A11Y_LOW_CONTRAST` — Catalog price text rendered below the WCAG AA contrast threshold

Card price renders in a near-background gray below WCAG AA 4.5:1 — axe 'color-contrast' rule.
  
_Where:_ `/products (product card price)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![A11Y_LOW_CONTRAST buggy](../private/bug-shots/A11Y_LOW_CONTRAST-buggy.png) | ![A11Y_LOW_CONTRAST clean](../private/bug-shots/A11Y_LOW_CONTRAST-clean.png) |

#### `A11Y_NO_KEYBOARD_FOCUS` — Cart quantity steppers are not keyboard-operable / have no focus ring

Steppers render as plain spans: skipped in the tab order, no keyboard activation, no focus ring.
  
_Where:_ `/cart (Tab to the −/+ quantity steppers)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![A11Y_NO_KEYBOARD_FOCUS buggy](../private/bug-shots/A11Y_NO_KEYBOARD_FOCUS-buggy.png) | ![A11Y_NO_KEYBOARD_FOCUS clean](../private/bug-shots/A11Y_NO_KEYBOARD_FOCUS-clean.png) |

### 6.3 Performance / Latency

#### `PERF_SLOW_CHECKOUT` — Checkout request hangs ~2s with no pending feedback (injected latency)

POST /api/checkout stalls ~2s with no loading feedback; the submit looks unresponsive.
  
_Where:_ `/checkout (submit) — POST /api/checkout`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![PERF_SLOW_CHECKOUT buggy](../private/bug-shots/PERF_SLOW_CHECKOUT-buggy.png) | ![PERF_SLOW_CHECKOUT clean](../private/bug-shots/PERF_SLOW_CHECKOUT-clean.png) |

#### `PERF_PRODUCTS_TTFB` — Products page blocks ~1.5s server-side before render, no loading skeleton

The products document blocks ~1.5s TTFB; the tab sits blank with no skeleton.
  
_Where:_ `/products (initial navigation)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![PERF_PRODUCTS_TTFB buggy](../private/bug-shots/PERF_PRODUCTS_TTFB-buggy.png) | ![PERF_PRODUCTS_TTFB clean](../private/bug-shots/PERF_PRODUCTS_TTFB-clean.png) |

#### `PERF_CART_WATERFALL` — Cart re-fetches each line's product one-by-one (sequential N+1 waterfall)

Cart fires one GET /api/products/[id] per line sequentially (N+1) for data already present.
  
_Where:_ `/cart with several distinct lines`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![PERF_CART_WATERFALL buggy](../private/bug-shots/PERF_CART_WATERFALL-buggy.png) | ![PERF_CART_WATERFALL clean](../private/bug-shots/PERF_CART_WATERFALL-clean.png) |

#### `PERF_OVERFETCH_PAYLOAD` — GET /api/products returns a bloated, duplicated payload the page never uses

Each product is padded with large unused/duplicated fields, bloating the response size.
  
_Where:_ `GET /api/products`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![PERF_OVERFETCH_PAYLOAD buggy](../private/bug-shots/PERF_OVERFETCH_PAYLOAD-buggy.png) | ![PERF_OVERFETCH_PAYLOAD clean](../private/bug-shots/PERF_OVERFETCH_PAYLOAD-clean.png) |

#### `PERF_NO_CACHE` — Catalog API forces no-store so every navigation refetches everything

Response carries Cache-Control: no-store, so the catalog refetches on every navigation.
  
_Where:_ `GET /api/products (repeat navigations)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![PERF_NO_CACHE buggy](../private/bug-shots/PERF_NO_CACHE-buggy.png) | ![PERF_NO_CACHE clean](../private/bug-shots/PERF_NO_CACHE-clean.png) |

### 6.4 Security / Transport (HIPAA)

#### `SEC_IDOR_ORDER` — Order detail drops the ownership check (IDOR: view another customer's order + PHI)

Ownership check is bypassed, so any order id renders another customer's order + PHI (IDOR).
  
_Where:_ `/orders/[id] (change the id to one you don't own)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_IDOR_ORDER buggy](../private/bug-shots/SEC_IDOR_ORDER-buggy.png) | ![SEC_IDOR_ORDER clean](../private/bug-shots/SEC_IDOR_ORDER-clean.png) |

#### `SEC_PHI_OVERFETCH` — Account API over-fetches PHI the view never needs (chain target of the IDOR)

Account response is padded with PHI the UI never shows (SSN, DOB, diagnoses, med history).
  
_Where:_ `/account — GET /api/account (response body)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_PHI_OVERFETCH buggy](../private/bug-shots/SEC_PHI_OVERFETCH-buggy.png) | ![SEC_PHI_OVERFETCH clean](../private/bug-shots/SEC_PHI_OVERFETCH-clean.png) |

#### `SEC_MISSING_ADMIN_AUTH` — Admin bug-flags API drops its admin guard (a customer can read/toggle flags)

Non-admins can read and toggle flags (200 + flag map instead of 403) — privilege escalation.
  
_Where:_ `GET/POST /api/admin/bug-flags as a non-admin`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_MISSING_ADMIN_AUTH buggy](../private/bug-shots/SEC_MISSING_ADMIN_AUTH-buggy.png) | ![SEC_MISSING_ADMIN_AUTH clean](../private/bug-shots/SEC_MISSING_ADMIN_AUTH-clean.png) |

#### `SEC_CREDS_IN_URL` — Login sends credentials in the URL query string (GET) instead of the POST body

Login submits a GET with ?email=…&password=…, exposing creds in the URL/history/logs.
  
_Where:_ `/login (sign in) — GET /api/auth/login`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_CREDS_IN_URL buggy](../private/bug-shots/SEC_CREDS_IN_URL-buggy.png) | ![SEC_CREDS_IN_URL clean](../private/bug-shots/SEC_CREDS_IN_URL-clean.png) |

#### `SEC_TOKEN_LOCALSTORAGE` — Client copies the session identity into localStorage (XSS-exfiltratable)

On login the identity is also written to localStorage (mb_identity), readable by any XSS.
  
_Where:_ `/login then DevTools → Application → Local Storage`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_TOKEN_LOCALSTORAGE buggy](../private/bug-shots/SEC_TOKEN_LOCALSTORAGE-buggy.png) | ![SEC_TOKEN_LOCALSTORAGE clean](../private/bug-shots/SEC_TOKEN_LOCALSTORAGE-clean.png) |

#### `SEC_PRICE_TAMPER` — Checkout trusts a client-supplied total instead of recomputing server-side

Server trusts a client clientTotal, so a tampered request underpays while still placing the order.
  
_Where:_ `POST /api/checkout with a tampered clientTotal field`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![SEC_PRICE_TAMPER buggy](../private/bug-shots/SEC_PRICE_TAMPER-buggy.png) | ![SEC_PRICE_TAMPER clean](../private/bug-shots/SEC_PRICE_TAMPER-clean.png) |

### 6.5 UI antipattern

#### `UI_DESTRUCTIVE_NO_CONFIRM` — Cart remove is instant & destructive with no confirmation

Remove deletes the line instantly with no confirmation — an accidental click is unrecoverable.
  
_Where:_ `/cart (click Remove on a line)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UI_DESTRUCTIVE_NO_CONFIRM buggy](../private/bug-shots/UI_DESTRUCTIVE_NO_CONFIRM-buggy.png) | ![UI_DESTRUCTIVE_NO_CONFIRM clean](../private/bug-shots/UI_DESTRUCTIVE_NO_CONFIRM-clean.png) |

#### `UI_NO_SUBMIT_FEEDBACK` — Checkout submit gives no visible feedback (no pending/disabled state)

Place-order button stays enabled with no spinner/label change while submitting (invites double-clicks).
  
_Where:_ `/checkout (click Place order)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UI_NO_SUBMIT_FEEDBACK buggy](../private/bug-shots/UI_NO_SUBMIT_FEEDBACK-buggy.png) | ![UI_NO_SUBMIT_FEEDBACK clean](../private/bug-shots/UI_NO_SUBMIT_FEEDBACK-clean.png) |

#### `UI_MISLEADING_ICON` — Cart remove button shows a misleading (non-destructive) icon

The destructive Remove button shows a friendly Heart icon instead of a trash can.
  
_Where:_ `/cart (Remove control)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UI_MISLEADING_ICON buggy](../private/bug-shots/UI_MISLEADING_ICON-buggy.png) | ![UI_MISLEADING_ICON clean](../private/bug-shots/UI_MISLEADING_ICON-clean.png) |

#### `UI_FORM_CLEARS_ON_ERROR` — A checkout validation error wipes the entered fields

A validation error resets the whole form, wiping every entered field, forcing a full re-type.
  
_Where:_ `/checkout (submit with a required field blank)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UI_FORM_CLEARS_ON_ERROR buggy](../private/bug-shots/UI_FORM_CLEARS_ON_ERROR-buggy.png) | ![UI_FORM_CLEARS_ON_ERROR clean](../private/bug-shots/UI_FORM_CLEARS_ON_ERROR-clean.png) |

### 6.6 UX

#### `UX_VAGUE_ERROR` — Checkout error path shows a vague 'Something went wrong' with no next step

Every checkout error collapses to a generic 'Something went wrong.' with no reason or next step.
  
_Where:_ `/checkout (force any checkout error)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UX_VAGUE_ERROR buggy](../private/bug-shots/UX_VAGUE_ERROR-buggy.png) | ![UX_VAGUE_ERROR clean](../private/bug-shots/UX_VAGUE_ERROR-clean.png) |

#### `UX_NO_ORDER_CONFIRM` — Order confirmation gives no clear success cue after placing the order

The 'Order placed — thank you!' success banner is suppressed; no clear 'it worked' cue.
  
_Where:_ `/orders/[id]?placed=1 (after checkout)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UX_NO_ORDER_CONFIRM buggy](../private/bug-shots/UX_NO_ORDER_CONFIRM-buggy.png) | ![UX_NO_ORDER_CONFIRM clean](../private/bug-shots/UX_NO_ORDER_CONFIRM-clean.png) |

#### `UX_SURPRISE_TAX` — Tax is hidden on the cart and only appears at the final checkout step

Cart hides the tax line and total; tax first appears at checkout — a surprise charge at the end.
  
_Where:_ `/cart then /checkout (compare summaries)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UX_SURPRISE_TAX buggy](../private/bug-shots/UX_SURPRISE_TAX-buggy.png) | ![UX_SURPRISE_TAX clean](../private/bug-shots/UX_SURPRISE_TAX-clean.png) |

#### `UX_LOST_CHECKOUT_PROGRESS` — Back navigation from checkout loses entered shipping/payment data

On a bfcache Back restore the checkout form resets, losing everything the customer typed.
  
_Where:_ `/checkout (fill, navigate away, press Back)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UX_LOST_CHECKOUT_PROGRESS buggy](../private/bug-shots/UX_LOST_CHECKOUT_PROGRESS-buggy.png) | ![UX_LOST_CHECKOUT_PROGRESS clean](../private/bug-shots/UX_LOST_CHECKOUT_PROGRESS-clean.png) |

#### `UX_NO_PAGE_TOTAL` — Catalog pagination shows no total pages / results indicator

The 'Page X of Y' indicator is removed, leaving bare page links with no sense of total.
  
_Where:_ `/products (the pager)`

| Buggy (customer, flag ON) | Clean (admin / correct) |
|---|---|
| ![UX_NO_PAGE_TOTAL buggy](../private/bug-shots/UX_NO_PAGE_TOTAL-buggy.png) | ![UX_NO_PAGE_TOTAL clean](../private/bug-shots/UX_NO_PAGE_TOTAL-clean.png) |

---

## 7. Deployment & environment (one-time setup)

The deploy needs a small key–value store so per-candidate state (cart, orders,
stock, account) survives Vercel's serverless requests and so access links can
expire. We use **Upstash Redis** (free tier is plenty).

**One-time setup:**
1. Create a free database at **console.upstash.com** (Redis → create database).
2. Copy its **REST URL** and **REST token** (the `UPSTASH_REDIS_REST_*` pair — NOT
   the `redis://…` connection string; the app uses the REST client).
3. In the Vercel project → **Settings → Environment Variables**, add them with
   **all environments** ticked (Production + Preview + Development):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `SESSION_SECRET` — a long random string (signs the auth + access cookies).
     Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
4. **Redeploy** (see the redeploy gotcha below).

> ⚠️ **Two setup gotchas that look like "it's broken":**
> - **No surrounding quotes.** Upstash's copy snippet shows `KEY="https://…"`. Paste
>   only the **bare value** into Vercel (`https://…`), never the quotes. Quoted values
>   pass the "is it set?" check but every Redis call then fails.
> - **Editing an env var does NOT redeploy.** The running build keeps the old value
>   until you trigger a **new deployment** (Deployments → ⋯ → Redeploy, or push a commit).

**Verify a deployment picked everything up** — hit **`/api/health`** (public, booleans
only, no secrets):
```
curl https://<your-app>/api/health
# want: {"ok":true,"redisEnv":true,"sessionSecretSet":true,
#        "urlStartsWithHttps":true,"urlHasQuotes":false,"redisOk":true,"redisError":null}
```
`redisOk:true` means reads/writes actually reach Redis. If `redisEnv` is false the vars
aren't in that deployment (scope/redeploy); if `urlHasQuotes:true` you pasted the quotes;
if `redisOk:false` with an error, the URL/token is wrong.

**Behavior by environment:**
- **Redis env present** (the deploy) → state persists in Redis; the access gate is
  **on** (candidates need a `/start?code=…` link; admin passes without one).
- **No Redis env** (local dev, `npm run dev`) → in-memory store; the gate is **off**
  (open the app directly, no link). Tests always run offline against the in-memory
  store.

No cron or cleanup job is needed. The small access record is a **persistent
roster entry** (access is a computed check on its status + window, not a key that
expires); the heavier per-candidate **state** keys carry a generous fixed TTL as
an auto-cleanup safety net, and **Remove** is the explicit hard delete. See
`docs/ACCESS-CONTROL.md`.

**Vercel note:** the deployed app must be publicly reachable (candidates aren't Vercel
users), so leave **Deployment Protection → Vercel Authentication** off for the public
instance — the app's own access gate is what secures it.

---

*Source of truth: `lib/bug-registry.ts` (flags) + `docs/ANSWER-KEY.md` (per-bug repro).
This runbook covers all 45 flags — every bug is implemented and browser-verified.*
