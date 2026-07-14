# MediByte — Presenter's Kit

> ⚠️ **PRIVATE — reviewer/presenter only.** Same sensitivity as `ANSWER-KEY.md` and
> `ADMIN-RUNBOOK.md` — it reveals seeded bugs. Never share with candidates.

This is your hold-in-your-hand kit for presenting MediByte live to the team. Three parts:
**(1) Live Demo Script**, **(2) Pitch Narrative**, **(3) Q&A Defense.** Built for the
**deployed Vercel URL with all 45 flags ON**, audience = **eng peers / interviewers**.

## Links

- **[App](https://medibyte-ten.vercel.app)** · **[Login](https://medibyte-ten.vercel.app/login)** · **[Admin](https://medibyte-ten.vercel.app/admin)** · **[Products](https://medibyte-ten.vercel.app/products)** · **[Orders](https://medibyte-ten.vercel.app/orders)** · **[Account](https://medibyte-ten.vercel.app/account)**
- **Logins:** admin `admin@medibyte.test`/`admin.incu123` · `dana@example.test`/`dana1234` · `omar@example.test`/`omar1234`

## Direct bug links — click straight to each bug

Base = `https://medibyte-ten.vercel.app` (swap for `http://localhost:4321` when running local).
Cart/checkout persist end-to-end on the deploy now (Redis-backed), so **every bug works on
either target**. Sign in as a **customer** (Dana) first — admin sees the clean app.

### Functional
| Click to open the bug | Look at |
|-----------------------|---------|
| [FN_PRICE_DECIMALS](https://medibyte-ten.vercel.app/products/prod-naproxen-220) | Price `$10.5` (one decimal) |
| [FN_PRICE_SORT_LEXICAL](https://medibyte-ten.vercel.app/products?sort=price-asc) | `$10.x` listed before `$5.x` |
| [FN_PAGINATION_OFFBYONE](https://medibyte-ten.vercel.app/products?page=2) | First item dropped / boundary skips one |
| [FN_CART_BADGE_LINES](http://localhost:4321/cart) | Header badge counts lines, not qty |
| [FN_INSTOCK_AT_ZERO](https://medibyte-ten.vercel.app/products/prod-fiber-supplement) | "In stock" + disabled Add button |
| [FN_NORESULTS_BLANK](https://medibyte-ten.vercel.app/products?q=zzzzz) | Blank area, no empty-state |
| [FN_ORDER_DATE_RAW](https://medibyte-ten.vercel.app/orders) | Raw ISO date `2026-…T…Z` |
| [FN_TRIPWIRE_COPY ⭐](https://medibyte-ten.vercel.app/products/prod-fiber-supplement) | OTC item, copy says "Prescription required" |
| [FN_QTY_NONPOSITIVE](http://localhost:4321/cart) | PATCH keeps `quantity:0` (Network) |
| [FN_CART_TOTAL_STALE](http://localhost:4321/cart) | Total ignores 1st line's qty |
| [FN_TAX_FLOOR](http://localhost:4321/cart) | Tax floored a cent (8% of subtotal) |
| [FN_EXPIRED_COUPON_OK](http://localhost:4321/cart) | Apply `SPRING2023` → discount applies |
| [FN_OOS_ADDABLE](http://localhost:4321/products/prod-fiber-supplement) | Add 0-stock item → 201 (Network) |
| [FN_POSTAL_UNVALIDATED](http://localhost:4321/checkout) | Submit blank postal → accepted |
| [FN_TAX_BEFORE_DISCOUNT](http://localhost:4321/cart) | Apply `SAVE10` → tax on pre-discount |
| [FN_COUPON_NEGATIVE 🎯](http://localhost:4321/cart) | 1× Ibuprofen + `MEGA50` → negative total |
| [FN_FILTER_LOST_ON_PAGE](https://medibyte-ten.vercel.app/products?q=vitamin) | Click page 2 → filter drops |
| [FN_PAGE_COUNT_UNFILTERED](https://medibyte-ten.vercel.app/products?category=Allergy) | "of 39" count vs items shown |
| [FN_OVERSELL](http://localhost:4321/products/prod-decongestant) | Order qty > 8 in stock → succeeds |
| [FN_CONCURRENT_DOUBLESPEND](http://localhost:4321/checkout) | Double-submit last units → both pass |
| [FN_TOTAL_ROUNDING_EDGE](http://localhost:4321/cart) | 5× Ibuprofen + `SAVE10` → Total off a cent |
| [FN_PARTIAL_CHECKOUT](http://localhost:4321/cart) | After checkout, cart still full |

### Accessibility
| Click to open the bug | Look at |
|-----------------------|---------|
| [A11Y_INPUT_NO_LABEL](http://localhost:4321/cart) | Coupon input has no accessible name (axe `label`) |
| [A11Y_LOW_CONTRAST](https://medibyte-ten.vercel.app/products) | Card price barely legible (axe `color-contrast`) |
| [A11Y_NO_KEYBOARD_FOCUS](http://localhost:4321/cart) | Tab skips the −/+ steppers |

### Performance (all DevTools → Network)
| Click to open the bug | Look at |
|-----------------------|---------|
| [PERF_SLOW_CHECKOUT](http://localhost:4321/checkout) | `POST /api/checkout` ~2s, no feedback |
| [PERF_PRODUCTS_TTFB](https://medibyte-ten.vercel.app/products) | ~1.5s blank TTFB on the document |
| [PERF_CART_WATERFALL](http://localhost:4321/cart) | N+1 `/api/products/<id>` staircase |
| [PERF_OVERFETCH_PAYLOAD](https://medibyte-ten.vercel.app/api/products) | Bloated `_raw`/`_seoKeywords[100]` fields |
| [PERF_NO_CACHE](https://medibyte-ten.vercel.app/api/products) | `Cache-Control: no-store` header |

### Security (sign in as Dana; use DevTools)
| Click to open the bug | Look at |
|-----------------------|---------|
| [SEC_IDOR_ORDER 🔗](https://medibyte-ten.vercel.app/orders/MB-20260305-0001) | Omar's order + PHI loads for Dana |
| [SEC_PHI_OVERFETCH 🔗](https://medibyte-ten.vercel.app/api/account) | PHI fields (`subscriberSsn`, `diagnosisCodes`) in JSON |
| [SEC_MISSING_ADMIN_AUTH](https://medibyte-ten.vercel.app/api/admin/bug-flags) | Customer gets 200 + flag map, not 403 |
| [SEC_CREDS_IN_URL](https://medibyte-ten.vercel.app/login) | Login GET with `?password=` in URL |
| [SEC_TOKEN_LOCALSTORAGE](https://medibyte-ten.vercel.app/login) | `mb_identity` in Application → Local Storage |
| [SEC_PRICE_TAMPER](http://localhost:4321/checkout) | Add `clientTotal` to request → order underpays |

> ### 🏥 HIPAA bugs — how to find them
> Only **two** bugs are true HIPAA/PHI leaks (the other four `SEC_*` are security holes but
> leak no health data). Both: sign in as **Dana** (customer, not admin); both work on the
> live Vercel URL (seeded data, no cart needed). They **chain**.
>
> **1. [`SEC_IDOR_ORDER`](https://medibyte-ten.vercel.app/orders/MB-20260305-0001) — read another patient's prescription.**
> As Dana, open `/orders` → one of *her* orders, then change the id in the URL to Omar's:
> **`/orders/MB-20260305-0001`**. His full record loads — **patient Omar, DOB 1979-11-02,
> Dr. Priya Nair, Rx RX-558310, Metformin**, + home address. *That's an unauthorized PHI
> disclosure.* (Clean app / admin → 404.)
>
> **2. [`SEC_PHI_OVERFETCH`](https://medibyte-ten.vercel.app/api/account) — PHI hidden in the API response.**
> As Dana, open `/account` → DevTools **Network** → the **`GET /api/account`** response. The
> `insurance` object is padded with PHI the page never shows: **`subscriberSsn`,
> `dateOfBirth`, `diagnosisCodes[]`, `medicationHistory[]`**. A DevTools find, not eyeball.
>
> **The chain (senior signal):** use the IDOR to reach a victim by id, then the over-fetch
> hands you PHI the UI would never render. A candidate who *connects* the two is showing
> exactly the reasoning we're hiring for.

### UI / UX
| Click to open the bug | Look at |
|-----------------------|---------|
| [UI_DESTRUCTIVE_NO_CONFIRM](http://localhost:4321/cart) | Remove deletes instantly, no confirm |
| [UI_NO_SUBMIT_FEEDBACK](http://localhost:4321/checkout) | Place-order button no spinner/disable |
| [UI_MISLEADING_ICON](http://localhost:4321/cart) | Remove shows a Heart icon |
| [UI_FORM_CLEARS_ON_ERROR](http://localhost:4321/checkout) | Validation error wipes all fields |
| [UX_VAGUE_ERROR](http://localhost:4321/checkout) | "Something went wrong" on any error |
| [UX_NO_ORDER_CONFIRM](http://localhost:4321/checkout) | No success banner after ordering |
| [UX_SURPRISE_TAX](http://localhost:4321/cart) | Cart hides tax; appears at checkout |
| [UX_LOST_CHECKOUT_PROGRESS](http://localhost:4321/checkout) | Fill, go Back → fields blank |
| [UX_NO_PAGE_TOTAL](https://medibyte-ten.vercel.app/products) | Pager has no "Page X of Y" |

---

## 🚨 Where to run the demo — READ THIS FIRST

**Present from LOCAL `npm run dev` → http://localhost:4321.** Not because anything is broken
on the deploy — cart/checkout now persist end-to-end there (Redis/Upstash-backed). Present
local because local has **no access gate and zero setup**: everything just works, no link to
mint, all 45 bugs live including the negative-total climax. The `/admin` reference is a
read-only bug catalog you *show*, not a switchboard you flip (flags are set in
`data/bug-flags.json` + redeploy — no runtime toggle anywhere).

- ✅ **Local (`localhost:4321`)** — full demo, all 45 bugs, gate off, most reliable. **Use this.**
- 🔗 **https://medibyte-ten.vercel.app** (public, all 45 on) — your **"it's live & shareable"
  closer.** Works for *everything now*, cart/checkout included (Redis-backed). One catch: it
  has a time-boxed **access gate** — a customer needs a personal `/start?code=…` link (minted
  at `/admin/candidates`) or they land on `/closed`; **admin bypasses the gate.** So it's a
  fine backup, but local needs no link at all. **Note:** this Phase-6 behavior (Redis + gate)
  currently lives on `dev`; production (`medibyte-ten.vercel.app`) only gets it after the
  Upstash env is set and `dev`→`main` merges — so "present local" is the safe default today.
- 🚫 Don't use `medibyte-medibyte.vercel.app` / `medibyte-git-main-medibyte.vercel.app` —
  they're behind Vercel's login wall (401).

---

## The one mental model that makes this easy

You don't "find" bugs live — you **walk a rehearsed path** where each bug is waiting for you.
The contrast that sells it:

- **Admin login = the clean, correct app** (`admin@medibyte.test` / `admin.incu123`). The bug
  gate (`lib/bugs.ts` → `isBugActiveWith`) excludes admins server-side, so admin *never*
  sees a bug. This is your live "answer key."
- **Customer login = the buggy app** (use `dana@example.test` / `dana1234` — she has seeded
  order history, which you need for `/orders` and the IDOR finale).

➡️ **Demo with two browser profiles side by side:** one window signed in as **admin**
(correct), one as **Dana** (buggy). Flip between them to show "same app, one is wrong."

> ℹ️ **`/admin` is a read-only bug reference — there are no switches to flip.** Show it as
> the answer-key machine: filter by category/difficulty, open the ⓘ details, pop the
> Buggy-vs-Clean screenshot **Preview** modal. Flags live in `data/bug-flags.json` (committed
> profile = all 45 on) and change only via redeploy — there's no runtime toggle to demo.

---

## Pre-flight checklist (do this 10 min before)

- [ ] **Start the local server:** `npm run dev`, then open **http://localhost:4321**.
  (Optional: have https://medibyte-ten.vercel.app open in another tab as the "it's live" backup.)
- [ ] **Two browser windows / profiles ready**, logged in ahead of time:
  - Window A — **admin** (`admin@medibyte.test` / `admin.incu123`)
  - Window B — **Dana** (`dana@example.test` / `dana1234`)
- [ ] **IDOR target (verified):** Omar's order id is **`MB-20260305-0001`** (Metformin —
  patient Omar, DOB 1979-11-02, Dr. Priya Nair, Rx RX-558310). Dana's own orders are
  `MB-20260112-0001` and `MB-20260228-0002`. You'll open Omar's id while logged in as Dana.
  *(If you re-seed/restart and ids change, log in as Omar, copy an order id, log back to Dana.)*
- [ ] DevTools docked (bottom), **Network** tab open, "Preserve log" on, zoomed so the room
  can read it. Practice opening it with `Cmd+Opt+I` / `F12`.
- [ ] Browser zoom at ~125–150% for the room.
- [ ] Pre-seed Dana's cart for the cart demos (steps below) so you're not fumbling at runtime.
- [ ] Have this doc open on a second screen / phone.

---

# Section 1 — Live Demo Script (~10 min)

Each step: **where → do this → say this → they see.** Run the acts in order; difficulty
escalates and the story builds. If you're short on time, the ⏩ steps are skippable.

## Act 0 — Set the stage (45 sec)

- **Where:** Admin window (A), `/products`.
- **Do:** Slowly scroll the catalog, open one product. "This is MediByte — an online
  pharmacy. Browse, cart, coupons, checkout, orders, prescriptions."
- **Say:** *"This is the clean app — exactly what a correct build looks like. Now I'll log in
  as a regular customer, and it's the **same app** — watch what's hiding in it."*
- Switch to Dana's window (B), same `/products` page.

## Act 1 — Eyeball tier: "these filter the skim-testers" (90 sec)

| # | Bug | Where (as Dana) | Do | They see |
|---|-----|-----------------|----|----------|
| 1 | `FN_PRICE_DECIMALS` | `/products` | Point at **Naproxen $10.5** (verified) | One decimal — `$10.5`, not `$10.49`. Admin shows `$10.49`. |
| 2 | `FN_PRICE_SORT_LEXICAL` | `/products`, sort **Price: low to high** | Scan the order | A `$10.x` item sorts **before** a `$3.x`/`$5.x` item — sorted as text, not numbers. |
| 3 + 4 | `FN_INSTOCK_AT_ZERO` **and** `FN_TRIPWIRE_COPY` | open **Daily Fiber Supplement Powder** (`/products/prod-fiber-supplement`) | Two bugs on one page | Badge says **"In stock"** while Add-to-cart is disabled + "currently unavailable" (contradiction); AND it's an **"Over the counter"** item whose copy says *"Prescription required…"* (the ⭐ reading tripwire). |

- **Tip (verified):** the Daily Fiber page is your best Act-1 stop — it shows the in-stock
  contradiction *and* the Rx/OTC tripwire together. (Ibuprofen 200's detail page has the same
  tripwire copy if you want a second example.)
- **Say (on the tripwire):** *"That one isn't a tool finding — it only catches a tester who
  actually **reads**. It's our tripwire against skim-testing and AI-pasted reports."*

## Act 2 — Cross-screen & edge tier: "these need a tester who combines steps" (2 min)

> ⚠️ **This act needs the cart.** It works on either target (cart persists on the deploy now,
> Redis-backed), but we present local — no access gate, no setup. Pre-seed as Dana: add
> **3× one product** and **1× Ibuprofen 200** earlier so totals are ready.

| # | Bug | Where | Do | They see |
|---|-----|-------|----|----------|
| 5 | `FN_CART_BADGE_LINES` | header vs `/cart` | Note header badge vs cart's "Subtotal (N items)" | Badge counts **lines, not quantity** (qty 3 → badge shows 1). |
| 6 | `FN_EXPIRED_COUPON_OK` | `/cart` coupon field | Apply **`SPRING2023`** (expired 2023-05-31) | Discount **applies** — an expired coupon is accepted. |
| 7 🎯 | `FN_COUPON_NEGATIVE` | `/cart` with just **1× Ibuprofen ($6.99)** | Apply **`MEGA50`** ($50 off) | **Total goes negative** — discount isn't clamped to the subtotal. |

- **Say (on #7):** *"This is the money one — a $50 coupon on a $7 cart and the store now owes
  the customer money. Unmistakable, and it only shows if you push an edge case."*

> ⚠️ With all 45 flags on, the deep arithmetic bugs (tax-on-pre-discount, tax-floor,
> rounding-edge) all fire at once and muddy each other — **don't demo those live.** Negative
> total (#7) is the one arithmetic bug that reads cleanly under everything-on. Point the team
> to `ANSWER-KEY.md` for the full arithmetic tier.

## Act 3 — UI quick hits: memorable & fast (45 sec)

- **Where:** Dana, `/cart`.
- **Do:** Point at the **Remove** control — it's a **Heart icon** (`UI_MISLEADING_ICON`).
  Click it: the line **vanishes instantly, no confirmation** (`UI_DESTRUCTIVE_NO_CONFIRM`).
- **Say:** *"A heart icon that deletes your item, instantly, with no undo. Two antipattern
  bugs in one control."*

## Act 4 — DevTools tier: "the Network tab is fair game" (2.5 min)

- **Say first:** *"We explicitly tell candidates to open DevTools. This is where senior
  signal starts."*

| # | Bug | Where | Do | They see |
|---|-----|-------|----|----------|
| 8 | `SEC_CREDS_IN_URL` | `/login` (sign Dana out & back in), Network tab | Watch the login request + URL bar | Login is a **GET** with `?email=…&password=…` — the **password is in the URL** / history / logs. |
| 9 | `SEC_TOKEN_LOCALSTORAGE` | DevTools → **Application → Local Storage** | Show the entry | An **`mb_identity`** entry holds the identity in JS-readable storage (should be httpOnly cookie only) — XSS can steal it. |
| 10 ⏩ | `PERF_OVERFETCH_PAYLOAD` | Network → `GET /api/products` | Show response **Size** + body | Each product padded with junk fields (`_raw`, `_seoKeywords[100]`, `_auditTrail[50]`) — response many times larger than needed. |

## Act 5 — THE FINALE: the chained HIPAA breach (2 min)

> This is your strongest moment. Build it slowly. You need Omar's order id from pre-flight.

1. **Where:** Dana's window, `/orders`. Open one of **her own** orders (`MB-20260112-0001`).
   *"As Dana, I can see my own order — name, address, prescription details."*
2. Now change the order id in the URL to **Omar's**: **`/orders/MB-20260305-0001`**.
3. **They see (`SEC_IDOR_ORDER`) — verified live:** Omar's full order loads for Dana — his
   **shipping address** (88 Cedar Court, Apt 3B, Austin TX) and **prescription block**:
   patient **Omar Customer**, **DOB 1979-11-02**, Dr. **Priya Nair**, **Rx RX-558310**,
   **Metformin** (a diabetes drug). *"I'm logged in as Dana. This is a different patient's
   prescription, name, birth date, and home address. That's a textbook IDOR — and a HIPAA
   breach."*
4. **Chain it (`SEC_PHI_OVERFETCH`):** go to `/account`, open Network, inspect
   `GET /api/account`. *"And the API over-returns PHI the screen never even shows —"* point
   at `subscriberSsn`, `dateOfBirth`, `diagnosisCodes[]`, `medicationHistory[]` in the JSON.
5. **Say:** *"Two bugs chain: one lets you reach another patient's records, the other leaks
   PHI the UI never renders. A senior candidate who finds and **connects** these is exactly
   the signal we can't get from a generic test-case dump."*

## Act 6 — Reveal the machine (60 sec)

- **Where:** Admin window, `/admin`.
- **Do:** Show the **read-only bug reference** — all 45 bugs grouped by category, filterable
  by category/difficulty, each with an ⓘ details panel and a Buggy-vs-Clean screenshot
  **Preview** modal. *(It's a reference you show, not a switchboard — nothing to toggle.)*
- **Say:** *"Every bug you just saw is one switch here. The clean app — what I'm seeing right
  now as admin — **is the live answer key**. Under the hood each bug is one entry in a
  registry plus one conditional:"*

  ```ts
  const total = isBugActive('FN_TAX_BEFORE_DISCOUNT', user) ? buggyTax(x) : correctTax(x)
  ```

- **Close:** *"Correct path is the default; the bug is the gated branch. Admin always gets
  correct. That's the whole mechanism — cheap to add bugs, nothing to keep in sync."*

## 60-second fallback (if the network/demo flakes)

Three bulletproof eyeball bugs, no DevTools, no cart state needed — just Dana on `/products`:
1. `FN_PRICE_DECIMALS` — `$10.5`.
2. `FN_PRICE_SORT_LEXICAL` — sort low→high, `$10` before `$3`.
3. `FN_INSTOCK_AT_ZERO` — Daily Fiber says "In stock" but can't be added.
Then: *"There are 45 of these across six categories — here's the answer key,"* and pivot to
the pitch.

---

# Section 2 — Pitch Narrative (5 beats for eng peers)

1. **The problem.** Our current assessments produce weak signal — candidates submit generic,
   often AI-generated test cases that all look the same. We can't tell who can actually
   **find** problems.

2. **The flip.** Instead of asking candidates to write tests against a spec, we build **one
   genuinely good app** and seed it with **45 real bugs** across six **categories**
   (functional, accessibility, performance, security, UI, UX) and four **difficulty tiers**
   (easy → expert). The task becomes: *find them, report them, write the test cases that
   catch them.* That measures real testing/debugging skill, not prompt-copying.

3. **Why a pharmacy.** On the surface it's plain e-commerce — anyone understands browse →
   cart → checkout with zero domain knowledge. Underneath, prescriptions carry **PHI**, which
   gives us a legitimate **security/HIPAA tier**: "a customer can read another patient's
   prescription" is obviously wrong to anyone *and* a textbook violation a senior can name.

4. **The mechanism (what you just saw in `/admin`).** Role-based feature flags. **Admin =
   clean reference app + bug-control panel; customer = buggy when a flag is on.** The clean
   build is the **live answer key**, so grading is a side-by-side comparison, not a memory
   test. Adding a bug = one registry entry + one conditional.

5. **What it actually measures.** Reading carefully (the tripwire), edge-case thinking (the
   negative-total coupon), DevTools fluency (creds-in-URL, payload bloat), and a security
   mindset (the IDOR→PHI chain). Difficulty is tiered by the **easiest path that surfaces the
   bug**, so we can calibrate per role.

---

# Section 3 — Q&A Defense (pre-answered)

**"Can't candidates just AI/Google the bugs?"**
It's a live, private instance — not a public repo. You can't find these by searching; you
have to actually exercise the app. The tripwire (reading) and the chained IDOR→PHI bug
specifically resist paste-and-pray. And we can rotate which bugs are on per candidate.

**"45 bugs at once — isn't that overwhelming and unfair?"** *(They'll ask this — the deploy
shows all 45.)*
The deployed instance is maxed **for this showcase**. Real assessments use a **curated
profile** — see `ADMIN-RUNBOOK.md`'s example profiles ("junior/balanced" ≈ 6–8 flags, mostly
eyeball; "senior/security" ≈ 7–9 flags, DevTools + HIPAA). You pick a focused set per
candidate; a handful of bugs in one or two categories gives a cleaner read than 45 at once.

**"How do you grade fairly and consistently?"**
The admin clean app is the live reference, and every bug has per-bug repro in
`ANSWER-KEY.md`. Candidates submit a fixed Excel template (Bug | Steps | Expected | Actual |
Severity | Test case); you review against the key. **Quality over count** — a few
well-documented reproducible reports beat a long vague list. Deliberately **no auto-scoring
engine** — the hire call is human judgment.

**"Won't the bugs interact and cause false positives?"**
Each bug is tiered by the *easiest path that finds it* and the clean (admin) build is
**provably correct** — Vitest unit tests on pricing/cart/coupon/tax + access-control, plus
axe on key pages. So a11y/logic bugs are injected, not accidental. (Caveat we're honest
about: with *all* flags on, the deep arithmetic bugs stack — which is exactly why real runs
use curated subsets.)

**"Maintenance — won't this rot?"**
The correct path is always the default; the bug is the gated branch (`isBugActive(...) ?
buggy : correct`). No parallel clean/buggy codebases to keep in sync. Add or remove a bug =
one registry entry + one conditional.

**"What stops candidates from sharing answers between cohorts?"**
Rotate the flag profile per candidate, self-registered accounts, and the signal is in the
**reasoning and report quality**, not just which bugs they name. Two people who found the
same IDOR can still be told apart by how they reported and reasoned about it.

**"Infra and cost?"**
No relational database — deterministic mock data behind real Next.js API routes (so the
Network tab is genuinely inspectable). Deploys free on Vercel. The only mutable state
(cart/orders) is **Redis-backed on the deploy** (Upstash) and in-memory locally / in tests —
so the demo data stays deterministic while carts still persist in production.

**"Does the cart work on the deployed link?"** *(They may poke the live URL.)*
Yes — cart and checkout persist end-to-end on the deploy now; mutable state is backed by
Redis (Upstash), so it survives Vercel's stateless lambdas. The only thing to know about the
deploy is the **access gate**: a customer needs a personal `/start?code=…` link (minted at
`/admin/candidates`) or they're sent to `/closed`; admin bypasses it. Locally there's no
Redis env, so the gate is off and the app is wide open — which is why I'm presenting local
(zero setup, no link to mint). Everything works on both.

**"Why feature flags instead of separate buggy branches?"**
Branches drift. With a flag the same code path serves both the correct and buggy behavior,
gated by role — the admin view and the candidate view can never silently diverge.

---

*Source of truth: `lib/bug-registry.ts` (flags) + `docs/ANSWER-KEY.md` (per-bug repro) +
`docs/ADMIN-RUNBOOK.md` (operator view) + `PLAN.md` (rationale). Clean/buggy screenshots for
every bug live in `private/bug-shots/<KEY>-{clean,buggy}.png`.*
