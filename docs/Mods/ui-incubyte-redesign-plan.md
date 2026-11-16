# MediByte UI redesign — Incubyte-derived visual system (handoff spec)

> **Who this is for:** the implementing agent (Opus). You have NOT seen the
> planning conversation. Everything you need is in this file. Read it fully
> before touching code. When something here conflicts with your instinct,
> this file wins.

> ## Build status — 2026-09-15
>
> Built on **`feat/ui-incubyte`** (off `dev`, as specified). **Not merged to `dev`**
> — the branch is the current design, `dev` and `main` still carry the old teal
> storefront. Steps 1–8 of §7 are committed, plus four follow-ups the spec did not
> anticipate:
>
> | Commit | What |
> |---|---|
> | steps 1–7 | tokens/fonts/pill buttons → shell → home → catalog + detail → cart + checkout → orders + account → admin, one commit each as specified |
> | `fix(ui): white page ground, mint kept as the hero band` | the all-mint ground was too much; mint was pulled back to the hero band only |
> | `feat(ui): product detail — the pack face` | §6.4 redone as a "pack face" panel |
> | `feat(ui): all-pages pass — ledger, receipts, identity card, auth panel` | orders as a ledger, mint receipts on cart/checkout, numbered checkout steps, dark-panel auth, sage panels for `/closed` and 404 |
> | `feat(brand): adopt the Concept 1 "sprout + cross" logo` | replaces the placeholder mark — `components/brand/logo.tsx`, `app/icon.svg`, `app/favicon.ico` (see `docs/brand/logo/README.md`) |
> | `feat(home): the medicine cabinet — …` | the home page was rebuilt again: search hero → `/products?q=`, category strip, three flip "doors" in Incubyte's measured colours, white product shelves. **The dark refill promo panel (§5.2 `PromoPanel`) left the home page** — `components/home/promo-panel.tsx` still exists but nothing renders it, so read §5.2 as history, not as current state |
>
> **In flight right now:** a quiet restyle of the inner pages plus a new
> `PageRail` wayfinding component (`components/layout/page-rail.tsx`) in the left
> gutter at ≥1640px, being added on this same branch.
>
> **The §0 invariant held.** The bug suites are still exactly **26 files / 94 tests**,
> all passing, and the full suite is 81 files / 1001 tests green — re-verified
> 2026-09-15. §8.1's baseline number is still the right number to check against.
> Note that the registry is now **50** entries (45 gated + 5 always-on Batch-7
> defects) — §0's "~50 seeded bugs" is exact.

---

## 0. The one invariant — read this first

**MediByte's ~50 seeded bugs are the specification, not defects.** This app
exists to assess QA candidates; the bugs ARE the assessment. Any change that
fixes, masks, or weakens a seeded bug is a **regression** — the project owner's
words: *"anything that fixes the bug is a bug for me."*

This redesign is **a skin over an unchanged bug layer**. You change colours,
type, radii, layout, spacing, shapes. You **never**:

- remove or alter an `isBugActive(...)` conditional or the prop it feeds;
- change the *degraded value* a bug branch emits (a class name, a string, a
  missing element, an icon);
- route a bug's render through any new shared helper (money/date formatter,
  empty-state, button-with-spinner, toast, icon set, global focus ring);
- add a label, confirm dialog, success banner, tax row, page total, loading
  state, or format fix anywhere a bug relies on its absence;
- touch a word of product copy (`data/products.ts`, product descriptions);
- add `id` / `htmlFor` / `data-testid` to storefront form fields (the
  automation-QA track deliberately removed them — see §6.4).

**The guardrail is mechanical, not a promise.** 26 `.bugs.test.ts(x)` suites /
94 tests pin the exact buggy-vs-clean output. Baseline is **94/94**. You run
them after **every** step. If any flips, you **revert that step** — you do not
"fix forward". §8 has the commands.

---

## 1. Why we're redoing this (what went wrong before)

A first pass (`feat/ui-refresh`, do not build on it) designed from a vague text
summary of incubyte.co and produced a near-invisible change: it kept the old
teal identical, nudged neutrals ~2%, used a geometric sans, and tightened
radii to a "clinical" 8px. Incubyte is the opposite on every axis. The owner's
verdict was correct: *"if that's all that changed… a pretty shit job."*

Repairs, each mapped to a mistake:

| Mistake | Repair (this spec) |
|---|---|
| Designed without looking at the site | Every value in §2 is **measured from the live DOM** |
| Geometric sans display type | **Fraunces** serif for headlines & product names |
| Kept the old teal, dominant colour never moved | Primary becomes deep green `#014D43`; **lime** `#D3FE73` added as a real second colour |
| Off-white page, imperceptible | **Mint** `#EBFFF6` page — visibly different on load |
| Tight 8px "clinical" radii, removed panels | **Full pills**, large radii, and a **dark-green promo panel** as the dramatic element |
| Let bug-safety make the visuals timid | Bugs are code branches; visuals change wholesale (§0 + §6) |

---

## 2. Source of truth — Incubyte, measured

Captured from https://incubyte.co/ via computed styles (not eyeballed).

### 2.1 Colours (most-used backgrounds, exact)
| Role on incubyte.co | Value |
|---|---|
| Page background (mint) | `#EBFFF6` — rgb(235,255,246) |
| Secondary mint (panels/sections) | `#E8F7ED` — rgb(232,247,237) |
| **Deep forest green** — hero headline, buttons, dark full-bleed blocks | `#014D43` — rgb(1,77,67) |
| **Lime accent** — the ↗ CTA chip, announcement bar | `#D3FE73` — rgb(211,254,115) |
| Footer (near-black navy) | `#060A1E` — rgb(6,10,30) |
| Body/heading near-black | `#0A0A0D` — rgb(10,10,13) |
| Pastel card fills | sage `#EEF2E5` · blush `#F9E4E8` · cyan `#5DC6D6` |
| Cards / nav bar | `#FFFFFF` |

### 2.2 Typography (computed)
| Use | Face | Weight | Size / line-height | Colour |
|---|---|---|---|---|
| Hero headline | **Fraunces** | 600 | 84px / **1.02** (extremely tight) | `#014D43` |
| Section headings | Fraunces | 400 / 600 | 36–48px / ~1.02 | `#0A0A0D` |
| Stat / large numbers | Fraunces | 600 | ~29px | `#0A0A0D` |
| Body, nav, buttons, labels | **Inclusive Sans** | 400 | 14–16px / 1.5 | `#0A0A0D` / `rgba(0,0,0,.8)` |

Both faces are on Google Fonts (`Fraunces`, `Inclusive_Sans` in `next/font/google`).

### 2.3 Shapes & components (observed)
- **Buttons are full pills** (`border-radius: 842px`), padding `10px 25px`.
- **Signature CTA = dark-green pill + a separate lime circle containing an ↗
  (arrow-up-right) icon**, sitting immediately to the right of the pill.
  Secondary CTA on dark panels = white pill + same lime circle.
- **Nav is a floating white pill bar**: inset from the viewport edges, fully
  rounded ends, soft shadow, logo left, links centre, CTA right. It floats over
  the mint page rather than spanning edge-to-edge.
- **Large-radius dark-green panels** (~28px radius) with white Fraunces
  headline, body text, a white-pill CTA + lime chip, a hairline rule, and a
  row of small icon+label items beneath. This is their most distinctive
  section and the template for our promo panel.
- **Section rhythm:** mint → dark-green panel → mint → white cards → dark footer.
- **Motif:** a quarter-circle / leaf tile pattern in two greens, low contrast,
  used as a decorative field (hero base, dark-panel background).
- Thin hairline dividers under the hero and inside panels.
- Overall: warm, green-forward, friendly-but-credible. **Not** minimal-white,
  **not** clinical.

---

## 3. MediByte design tokens (what to write)

Edit `app/globals.css`. The file uses Tailwind v4 (`@theme inline` maps
`--color-*` to CSS vars in `:root`). Existing values are `oklch(...)`; **use
hex for the new values** — CSS vars accept any colour, and hand-converted
oklch is where errors creep in.

### 3.1 `:root` (light — the only mode the app actually runs)
```css
--background:            #EBFFF6;  /* mint page */
--foreground:            #0A0A0D;  /* near-black text */
--card:                  #FFFFFF;
--card-foreground:       #0A0A0D;
--popover:               #FFFFFF;
--popover-foreground:    #0A0A0D;
--primary:               #014D43;  /* deep forest green — REPLACES the teal */
--primary-foreground:    #FFFFFF;
--secondary:             #E8F7ED;  /* secondary mint */
--secondary-foreground:  #014D43;
--muted:                 #E8F7ED;
--muted-foreground:      #66716D;  /* SEE §3.3 — do not darken */
--accent:                #E8F7ED;  /* keep shadcn `accent` SOFT — it drives ghost-button hover */
--accent-foreground:     #014D43;
--destructive:           #B3261E;
--border:                #D5E6DC;  /* hairline, tinted toward the mint */
--input:                 #D5E6DC;
--ring:                  #014D43;
--radius:                1rem;     /* cards; pills are set explicitly (§3.4) */

/* NEW tokens — add these AND their @theme mappings (§3.2) */
--lime:                  #D3FE73;  /* the ↗ chip, highlights */
--lime-foreground:       #014D43;
--otc:                   #EEF2E5;  /* sage — OTC badge/panel fill */
--otc-foreground:        #014D43;
--rx:                    #F9E4E8;  /* blush — Rx badge/panel fill */
--rx-foreground:         #7A1F3D;  /* deep rose text on blush (≥4.5:1) */
--panel:                 #014D43;  /* dark promo panel bg */
--panel-foreground:      #FFFFFF;
--footer:                #060A1E;
--footer-foreground:     #EBFFF6;
```

### 3.2 `@theme inline` additions
```css
--color-lime: var(--lime);
--color-lime-foreground: var(--lime-foreground);
--color-otc: var(--otc);
--color-otc-foreground: var(--otc-foreground);
--color-rx: var(--rx);
--color-rx-foreground: var(--rx-foreground);
--color-panel: var(--panel);
--color-panel-foreground: var(--panel-foreground);
--color-footer: var(--footer);
--color-footer-foreground: var(--footer-foreground);
--font-heading: var(--font-heading);   /* currently maps to --font-sans; point it at the new var */
```
Keep `--font-sans` and `--font-mono` mappings as they are.

### 3.3 The `--muted-foreground` constraint (bug-critical)
The seeded **`A11Y_LOW_CONTRAST`** renders the catalog price with the class
`text-muted-foreground/40` (40% alpha of this token) on the **white card**.
That must stay **genuinely below WCAG AA (4.5:1)** — and the *un*faded muted
text must stay **≥ 4.5:1** so the clean app's own a11y isn't broken.

`#66716D` on white ≈ **5.0:1** (clean muted text passes). At 40% alpha over
white it blends to ≈ `#C2C6C4` ≈ **1.8:1** (bug stays sub-AA). **Do not darken
this token.** Verify with the check in §8.4.

### 3.4 Shapes
- **Cards / panels:** `rounded-2xl` (1rem via `--radius`) for product cards
  and content cards; the dark promo panel and the auth card use
  `rounded-[1.75rem]`.
- **Buttons: full pills.** In `components/ui/button.tsx` change the base
  radius class to `rounded-full`. Padding for the default size ≈ `px-6`. This
  is visual only; the Button's `disabled`/children logic is untouched.
- **Nav:** floating white pill — see §6.2.
- **Badges/chips:** `rounded-full`.

### 3.5 `.dark` block
The app never toggles dark mode. Update `.dark` to a coherent deep-green
scheme (bg `#0B2A25`, fg `#EBFFF6`, primary `#D3FE73`, card `#103A33`) so it
isn't broken, but **do not spend time perfecting it**. Not in scope.

### 3.6 Base layer additions
- Keep the existing `@layer base` rules.
- Add tabular figures to tables: `th, td { font-variant-numeric: tabular-nums lining-nums; }`.
- Add a reduced-motion block:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  }
  ```

---

## 4. Typography spec

Edit `app/layout.tsx`. Current imports (on `dev`): `Geist`, `Geist_Mono`.

```ts
import { Fraunces, Geist_Mono, Inclusive_Sans } from "next/font/google";

const inclusiveSans = Inclusive_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400"] });
// Fraunces is a VARIABLE font. Do NOT pass `weight` alongside `axes` — Next
// errors with "Axes can only be defined for variable fonts when the weight
// property is nonexistent or set to `variable`". Omitting weight gives the full
// range (we use 400/600) and `opsz` optically sizes large display text.
const fraunces = Fraunces({ variable: "--font-heading", subsets: ["latin"], axes: ["opsz"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```
Apply all three variables on `<html className=...>`. (If `Inclusive_Sans` only
exposes weight 400 — it does — do not request others or the build fails.)

**Where each face is used**
| Face | Class | Used for |
|---|---|---|
| Fraunces | `font-heading` | page `h1`s, section `h2`s, **product names** (catalog card + detail), the promo-panel headline, stat/large prices on detail |
| Inclusive Sans | `font-sans` (default) | everything else — body, nav, buttons, labels, table text, badges |

**Scale (desktop → mobile)**
| Role | Size | Weight | Line-height | Tracking | Colour |
|---|---|---|---|---|---|
| Home hero h1 | `text-[3.75rem] sm:text-[5rem]` | 600 | `leading-[1.02]` | `tracking-[-0.01em]` | `text-primary` (the green — this is Incubyte's signature move) |
| Page h1 (cart, orders, account, catalog) | `text-[2.5rem]` | 600 | `leading-[1.05]` | — | `text-foreground` |
| Section h2 | `text-[2rem]` | 600 | `leading-[1.08]` | — | `text-foreground` |
| Promo-panel headline | `text-[2.25rem] sm:text-[2.75rem]` | 600 | `leading-[1.05]` | — | `text-panel-foreground` |
| Product name (card) | `text-[1.25rem]` | 600 | `leading-snug` | — | `text-foreground`, `group-hover:text-primary` |
| Product name (detail h1) | `text-[2.5rem]` | 600 | `leading-[1.08]` | — | `text-foreground` |
| Price (card) | `text-2xl` | 600 (Inclusive is 400-only → use `font-heading` Fraunces 600 for prices, `tabular-nums`) | — | — | see bug note §6.3 |
| Body | `text-base` / `text-sm` | 400 | `leading-relaxed` | — | `text-foreground` |
| Muted | `text-sm` | 400 | — | — | `text-muted-foreground` |

Line lengths: keep body copy ≤ ~70ch (`max-w-xl`/`max-w-2xl`).

---

## 5. New shared pieces (build once, reuse)

### 5.1 `components/ui/cta-chip.tsx` — the lime ↗ circle
A purely decorative companion placed immediately right of a primary pill.
```tsx
import { ArrowUpRight } from "lucide-react";
export function CtaChip({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground", className)}>
      <ArrowUpRight className="size-5" strokeWidth={2.25} />
    </span>
  );
}
```
Usage pattern: `<div className="inline-flex items-center gap-1"><Button …>Label</Button><CtaChip/></div>`.
**Rule:** the chip is `aria-hidden` and never a control. **Do NOT add it to
the checkout "Place order" button** (that button carries `UI_NO_SUBMIT_FEEDBACK`;
leave that whole element alone).

### 5.2 `components/home/promo-panel.tsx` — the dark-green panel
Template = Incubyte's dark block (§2.3). Full container width, `rounded-[1.75rem]`,
`bg-panel text-panel-foreground`, generous padding (`p-8 sm:p-12`), a
low-contrast **tile motif** SVG absolutely positioned behind the left third,
content on the right:
- small label line (Inclusive Sans, `text-lime`, e.g. "Prescription care"),
- Fraunces headline (white),
- one short paragraph (`text-panel-foreground/85`, `max-w-xl`),
- CTA row: **white pill button** (`bg-white text-primary`) + `CtaChip`,
- hairline (`border-panel-foreground/20`) then a row of 3 icon+label items
  (e.g. "Refill reminders", "Pharmacist review", "Delivered to your door").

**Copy must be plain and honest** (this is a mock pharmacy — no medical claims).
Suggested headline: *"Never run out of what you take every day."* Body:
*"Set a refill reminder and we'll nudge you before your supply runs low. Your
prescription details stay private and are used only to fill your order."*
CTA: **"Set a refill reminder"** — reuse the existing `RefillReminder`
component's behaviour if it is a button/dialog; wrap or restyle it as the
white pill. Read `components/home/refill-reminder.tsx` first.

**Tile motif SVG** (inline, `aria-hidden`, `opacity-[0.18]`): a repeating
pattern of quarter-circles. Minimal version:
```tsx
<svg aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-[0.18]" viewBox="0 0 400 400" preserveAspectRatio="xMinYMid slice">
  <defs><pattern id="tiles" width="100" height="100" patternUnits="userSpaceOnUse">
    <path d="M0 0h100v100A100 100 0 0 0 0 0z" fill="#D3FE73"/>
    <path d="M100 100H0V0a100 100 0 0 1 100 100z" fill="#5DC6D6"/>
  </pattern></defs>
  <rect width="400" height="400" fill="url(#tiles)"/>
</svg>
```
Use it **only** on the promo panel (one motif, one place).

### 5.3 Badges — `components/products/product-type-badge.tsx`
Pastel fills from Incubyte's own set, text + icon kept (colour is never the only cue):
- OTC → `bg-otc text-otc-foreground`
- Rx  → `bg-rx text-rx-foreground`
Shape `rounded-full px-3 py-1 text-xs font-medium`.

---

## 6. File-by-file changes and the do-not-touch anchors

Legend — **STYLE**: change class strings / wrappers only. **LEAVE**: do not
edit this file/expression at all. Anchors in `code` must remain byte-identical.

### 6.1 Tokens & fonts
- `app/globals.css` — §3 in full.
- `app/layout.tsx` — §4 fonts. Everything else in the file unchanged.
- `app/icon.svg`, `app/favicon.ico` — recolour the plus-cross mark from
  `#007d64` to **`#014D43`** (svg: edit the `fill`; ico: regenerate from the
  svg the same way it was made, or leave the .ico if regeneration tooling is
  unavailable and note it).
- `components/brand/logo.tsx` — **LEAVE.** It uses `bg-primary` / `text-primary`,
  so it turns green automatically.

### 6.2 Shell
- `components/layout/site-header.tsx` — **STYLE, with one bug anchor.**
  Make it the floating pill: outer `<header className="sticky top-0 z-40 px-4 pt-3 sm:px-6">`
  with an inner bar `mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 rounded-full border border-border/60 bg-white px-3 pl-5 shadow-[0_8px_30px_rgba(1,77,67,0.08)]`.
  Group nav as before (shopping | account | admin) with thin dividers. The
  logged-out **"Sign in"** = `<Button>` (green pill) + `<CtaChip/>`. Keep every
  `href`, every `aria-label`, the `user.role === "admin"` gating, and the
  `LogoutButton`.
  **LEAVE byte-identical:** the `FN_CART_BADGE_LINES` block —
  `const badgeCountsLines = isBugActive("FN_CART_BADGE_LINES", user);`,
  the `cartCount` ternary, the Link `aria-label={\`Cart, ${cartCount} …\`}`,
  and the badge `<span … tabular-nums>{cartCount}</span>`. Only its
  surrounding classes may change.
- `components/layout/site-footer.tsx` — **STYLE.** `bg-footer text-footer-foreground`,
  `mt-20`, `py-12`; wordmark in Fraunces (`font-heading text-xl`), the
  assessment notice, and a hairline. Keep the notice text as-is.
- `components/layout/test-app-tile.tsx` — **STYLE only, and do NOT fix its
  lint error.** Keep it red (it is a warning), reshape to `rounded-full`. It
  has a known pre-existing `react-hooks/set-state-in-effect` lint error in the
  `useEffect(() => setDismissed(false), [pathname])` — out of scope, leave it.
- `components/auth/auth-card.tsx` — **STYLE.** `rounded-[1.75rem]`, `max-w-[26rem]`,
  `p-8 sm:p-10`, title in Fraunces `text-[2rem]`, sit it `pt-8 sm:pt-16`.
- `components/auth/credentials-form.tsx` — **LEAVE.** Carries
  `credentialsInUrl` (`SEC_CREDS_IN_URL`) and `persistIdentityToLocalStorage`
  (`SEC_TOKEN_LOCALSTORAGE`). Its submit button inherits the pill from §3.4;
  that is enough.
- `components/ui/button.tsx` — **STYLE:** base radius → `rounded-full`. Nothing else.

### 6.3 Home + catalog + card
- `app/(storefront)/page.tsx` — **STYLE + structure (no bug flags here).**
  Order: hero → `<PromoPanel/>` → featured grid.
  - Hero: `<section className="pt-10 sm:pt-16 pb-12">` with the h1 per §4 in
    **`text-primary`**, the description `max-w-xl`, then a CTA row. Keep
    `RefillReminder` — either inside the promo panel (preferred) or here, not
    both. End the hero with a hairline (`border-b border-border`).
  - **Keep `brand.name` rendered as its own text node somewhere on the page**
    (e.g. as the promo panel's small label, or a short line under the hero).
    `app/(storefront)/page.test.tsx` asserts `getAllByText(brand.name)`
    exactly; keeping a standalone brand element means **no test edit is
    needed**. Do not weaken that test.
  - Featured section: h2 Fraunces; the "View all products" link — drop the
    trailing `→` arrow icon (generic tell); keep it a plain underlined link.
  - **LEAVE:** `<ProductCatalog products={featured} />` exactly as-is with **no
    bug props**. (Pre-existing: the home grid always renders clean. Not a
    restyle's decision to change — do not add flags here.)
- `components/products/product-catalog.tsx` — **STYLE with three anchors.**
  Card: `rounded-2xl border border-border bg-card p-6`, hover `hover:border-primary/40 hover:shadow-[0_10px_30px_rgba(1,77,67,0.08)]`,
  no resting shadow. Badge → name (Fraunces §4) → description → Rx line →
  a hairline → figures row.
  **LEAVE byte-identical:**
  1. the price element's class branch — `lowContrast ? "text-muted-foreground/40" : "text-foreground"` — and it must remain the class of the **single element whose text is the price** (the `page.a11y-low-contrast.bugs` test does `getByText("$6.99").className`);
  2. `{formatPrice(product.price, { dropDecimal })}`;
  3. `<StockPill stock={product.stock} inStockAtZero={inStockAtZero} />` and the whole `StockPill` function including `stockLabel(stock, { inStockAtZero })` and its status ternary.
  The empty-state `<p role="status">No products are available right now.</p>` stays.
  The "Requires a valid prescription" line: restyle to `text-rx-foreground`, keep the text.
- `components/products/product-type-badge.tsx` — §5.3.
- `app/(storefront)/products/page.tsx` — **STYLE only.** Page h1 Fraunces.
  **LEAVE:** every `isBugActive` resolution and the props passed down
  (`dropDecimal`, `inStockAtZero`, `lowContrast`, the `FN_NORESULTS_BLANK`
  empty-state suppression, `PERF_PRODUCTS_TTFB`). The "Showing N of M"
  status line stays.
- `components/products/catalog-toolbar.tsx` — **STYLE only. Locator-hardening
  is intentional:** labels wrap their controls implicitly with **no `id` /
  `htmlFor`** (PR #1, automation track). Restyle inputs/selects as pills
  (`rounded-full`), the Apply button inherits the pill. **Never add `id`,
  `htmlFor`, or `data-testid`.**
- `components/products/catalog-pagination.tsx` — **STYLE only.** Pill page
  links. **LEAVE** the `hidePageTotal` (`UX_NO_PAGE_TOTAL`) and `dropFilters`
  (`FN_FILTER_LOST_ON_PAGE`) branches and the href construction.

### 6.4 Product detail — `app/(storefront)/products/[id]/page.tsx`
**STYLE with four anchors.**
- Left panel: `rounded-[1.75rem] aspect-[5/4] max-h-80`, fill by type:
  `product.requiresPrescription ? "bg-rx" : "bg-otc"`, icon `text-rx-foreground/40` / `text-primary/40`.
- Name h1 Fraunces (§4). Price: Fraunces 600 `text-[2.25rem] tabular-nums`.
- Add-to-cart: `AddToCartButton` inherits the pill; place a `<CtaChip/>`
  beside it **only if** `AddToCartButton` renders a plain `<Button>` and the
  chip sits outside it — do not alter `AddToCartButton`'s `disabled` logic.
- Rx note box → `border-rx-foreground/20 bg-rx text-rx-foreground`, keep both sentences.
**LEAVE byte-identical:**
1. the `tripwireCopy` block — condition, both strings, everything (`FN_TRIPWIRE_COPY`);
2. the stock `<p>` `className={cn("text-sm font-medium", <the inStockAtZero ternary>)}` expression and `{stockLabel(product.stock, { inStockAtZero })}` (`FN_INSTOCK_AT_ZERO`);
3. `{formatPrice(product.price, { dropDecimal })}`;
4. `disabled={status === "out-of-stock"}` on `AddToCartButton` and the
   `"This item is currently unavailable."` note (part of the FN_INSTOCK_AT_ZERO contradiction).

### 6.5 Cart + checkout (densest bug zone — class strings only)
- `app/(storefront)/cart/page.tsx` — **STYLE only.** Line items
  `rounded-2xl border border-border bg-card p-6`; summary panel
  `rounded-2xl … lg:sticky lg:top-24`; "Proceed to checkout" `<Button>` pill
  (+ `CtaChip` beside it is fine — it's a Link, not the submit).
  **LEAVE byte-identical:** every `isBugActive(...)` line; the props
  `noKeyboardFocus`, `removeWithoutConfirm`, `misleadingRemoveIcon`,
  `noLabel`, `waterfall`; `{!hideTaxOnCart && <SummaryRow label="Tax (8%)" … />}`;
  `label={hideTaxOnCart ? "Subtotal" : "Total"}` and its `value` expression;
  **every `SummaryRow`** (Subtotal / Discount / Tax / Total must all remain
  visible — the tax/coupon/rounding math bugs are found by checking these rows).
- `components/cart/cart-line-controls.tsx` — **LEAVE. Do not open it.**
  (`A11Y_NO_KEYBOARD_FOCUS` spans + `outline:none`, `UI_MISLEADING_ICON` Heart,
  `UI_DESTRUCTIVE_NO_CONFIRM`.) Its buttons pick up the pill from `button.tsx`.
- `components/cart/coupon-form.tsx` — **LEAVE.** (`A11Y_INPUT_NO_LABEL` `noLabel`
  branch; `useId()` aria-describedby from locator hardening.) Pill inherits.
- `components/cart/cart-line-prefetch.tsx`, `add-to-cart-button.tsx` — **LEAVE.**
- `components/checkout/checkout-form.tsx` — **STYLE the `Section` wrapper only**
  (`rounded-2xl border border-border bg-card p-6 sm:p-8`, heading Fraunces,
  hairline between heading and fields). **LEAVE byte-identical:** the submit
  `<Button …>` (its `disabled={noSubmitFeedback ? false : submitting}` and
  label ternary — `UI_NO_SUBMIT_FEEDBACK`), `clearFieldsOnError` /
  `formEl.reset()` (`UI_FORM_CLEARS_ON_ERROR`), every `vagueError ? "Something
  went wrong." : …` (`UX_VAGUE_ERROR`), the `pageshow` effect
  (`UX_LOST_CHECKOUT_PROGRESS`), all `validate*` calls, and the `Field` component.
- `app/(storefront)/checkout/page.tsx` — **STYLE only** (h1, panels, empty state).

### 6.6 Orders + account
- `app/(storefront)/orders/page.tsx` — **STYLE only.** **LEAVE:**
  `{(rawDate ? order.placedAt : formatOrderDate(order.placedAt))}` (`FN_ORDER_DATE_RAW`).
- `app/(storefront)/orders/[id]/page.tsx` — **STYLE only.** **LEAVE:** the
  `?placed=1` success-banner conditional (`UX_NO_ORDER_CONFIRM`) — restyle the
  banner's classes if you like, never its condition; the ownership/IDOR data
  path is server-side, untouched.
- `app/(storefront)/account/page.tsx`, `components/account/account-manager.tsx` —
  **STYLE only** (panels `rounded-2xl`, headings Fraunces). Do not change the
  delete/remove/validation behaviour.

### 6.7 Admin (clean reference — lowest priority)
- `app/admin/page.tsx`, `app/admin/candidates/page.tsx`,
  `components/admin/bug-reference.tsx`, `components/admin/candidate-manager.tsx` —
  **STYLE only** for consistency (radii, Fraunces headings). No customer bug
  branches live here.

### 6.8 Never open these
`lib/format.ts` (`formatPrice`, `stockLabel`), `lib/bugs.ts`,
`lib/bug-registry.ts`, `data/bug-flags.json`, `data/products.ts`,
`lib/cart/*`, `lib/orders/*`, `lib/coupons/*`, anything under `app/api/`.

---

## 7. Step order, gates, and commits

Work on **a fresh branch off `dev`**:
```bash
git fetch origin && git checkout dev && git pull --ff-only
git checkout -b feat/ui-incubyte
```
**Do not build on `feat/ui-refresh`** (the rejected pass). Leave that branch
alone; the owner will delete it.

One commit per step, pushed after each. **Never merge to `dev`** — the owner
merges on "looks good".

| Step | Scope | Gate before commit |
|---|---|---|
| 1 | §3 tokens + §4 fonts + §3.4 button pill + icon recolour | §8.1–8.3 green; §8.4 contrast check |
| 2 | §6.2 shell: floating pill nav + CtaChip + footer + auth card + test-app tile | §8.1–8.3 green; screenshot `/login` |
| 3 | §6.3 home: hero + **PromoPanel** + featured grid + badge + card | §8.1–8.3 green; **screenshot `/` as admin AND as dana** → **STOP. Post the screenshots and wait for the owner's approval before step 4.** |
| 4 | §6.3 catalog page + toolbar + pagination; §6.4 product detail | §8.1–8.3; screenshots `/products` (as dana — faded price + `$x.x` must be visible) and an Rx detail page |
| 5 | §6.5 cart + checkout | §8.1–8.3; screenshot `/cart` as dana (Heart icon, no tax row must be visible) |
| 6 | §6.6 orders + account | §8.1–8.3; screenshot `/orders` as dana (raw ISO date visible) |
| 7 | §6.7 admin | §8.1–8.3 |
| 8 | §8.5 manual dana click-through; write the final report | — |

**Commit message template**
```
feat(ui): step N — <title>

<what changed, 2–5 lines>

Bug-safety: <which branches/anchors were left byte-identical>.
Bug suites 26 files / 94 tests unchanged; full suite green; build clean.

Co-Authored-By: <your model name> <noreply@anthropic.com>
```

---

## 8. Verification protocol (run after EVERY step)

### 8.1 Bug suites — must be exactly 26 files / 94 tests, all passing
```bash
npx vitest run --reporter=dot $(find . -name "*.bugs.test.ts*" -not -path "./node_modules/*" | tr '\n' ' ') 2>&1 | tail -4
```
Take this **before** step 1 as the baseline and confirm 94/94. If any later run
is not 94/94 → `git checkout -- .` (or revert the commit) and rework the step.

### 8.2 Full suite — all pass, no new failures
```bash
npx vitest run 2>&1 | tail -4
```
The only test a restyle may legitimately break is a **layout/copy assertion**
in a non-bug test. If one fails: first prefer changing the **UI** so the test
passes unchanged; only if the assertion is truly about the removed layout,
update the **query** (never the assertion's intent) and explain it in the
commit. Never touch a `*.bugs.test.*` file.

### 8.3 Build + lint
```bash
npm run build 2>&1 | grep -iE "Compiled successfully|Failed|error" | head
npm run lint 2>&1 | tail -5
```
Lint has **one pre-existing error** in `components/layout/test-app-tile.tsx`
(`react-hooks/set-state-in-effect`). It is out of scope — do not fix it and
do not introduce any new lint errors.

### 8.4 Contrast check for `A11Y_LOW_CONTRAST` (after step 1 and again at the end)
Confirm the faded price is still sub-AA and clean muted text still passes:
```bash
node -e '
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const[l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return (l1+.05)/(l2+.05)};
const white=[255,255,255], muted=hex("#66716D");
const faded=muted.map((c,i)=>Math.round(c*.4+white[i]*.6));  // 40% alpha over white
console.log("muted on white      :", ratio(muted,white).toFixed(2), "(need >= 4.5)");
console.log("muted/40 on white   :", ratio(faded,white).toFixed(2), "(need <  4.5 — the bug must stay sub-AA)");
'
```
Expected ≈ `5.0` and ≈ `1.8`. If you change `--muted-foreground`, re-run.

### 8.5 Manual dana click-through (step 8) — the tells must be VISIBLE
Dev server: `npm run dev` (port **4321**). Use the Chrome DevTools MCP to
sign in as **`dana@example.test` / `dana1234`** and confirm, by eye:
- `/products` — prices faded grey and one-decimal (`$8.5`); the 0-stock
  "Daily Fiber Supplement" shows **In stock** beside a disabled Add button;
  search `?q=zzzzz` shows a blank area with no helpful empty state.
- `/products/prod-decongestant` — an OTC item whose copy says "Prescription
  required…" (tripwire).
- `/cart` (add an item first) — coupon input has **no visible label**; the
  `−`/`+` steppers **can't be tabbed to**; the Remove control shows a **Heart**;
  summary shows **no Tax row**; Remove deletes instantly with **no confirm**.
- `/checkout` — submit with a blank field: the whole form **clears** and shows
  **"Something went wrong."**; on a valid submit the button shows **no pending
  state**.
- `/orders` — dates render as **raw ISO** strings; the order page after a
  purchase shows **no success banner**.
Then sign in as **`admin@medibyte.test` / `admin.incu123`** and confirm the
same screens render **clean**. Screenshot both.

---

## 9. Definition of done
- Steps 1–7 committed and pushed on `feat/ui-incubyte`; **not merged**.
- Bug suites **26 / 94** at every step (state each in its commit).
- Full suite green, build clean, lint has only the one pre-existing error.
- §8.4 contrast check passes at the end.
- §8.5 dana click-through done; screenshots of home, catalog (dana), an Rx
  detail, cart (dana), orders (dana) attached to the final report.
- The page **looks like a different product**: mint page, deep-green Fraunces
  headlines, lime ↗ chips, floating pill nav, a dark-green promo panel, pill
  buttons. If a stakeholder could mistake it for the old UI, step 3 failed the
  gate — do not proceed past it.
- A final report to the owner: what changed per step, every test touched (if
  any) with justification, and the explicit statement that no `*.bugs.test.*`
  file was modified and all 94 bug tests passed unchanged.

---

## Appendix A — MediByte facts you'll need
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui.
  Storefront routes live under `app/(storefront)/`. Tests: Vitest + RTL.
- Dev server: `npm run dev` → http://localhost:4321 (a session may already be
  running; check `lsof -iTCP:4321`). Pages redirect to `/login` unless signed in.
- Logins: admin `admin@medibyte.test` / `admin.incu123` (sees the **clean**
  app — always correct behaviour). Customer `dana@example.test` / `dana1234`
  (sees the **bugs**). Steve `steve@example.test` / `steve1234` (qa_automation —
  clean app, no admin).
- Bugs manifest **only for customers** — verify buggy visuals as dana, clean
  visuals as admin.
- The 26 bug-suite files (for reference):
  `app/(storefront)/cart/page.{a11y,perf,ui-ux}.bugs.test.tsx`,
  `app/(storefront)/orders/[id]/page.bugs.test.tsx`, `orders/page.bugs.test.tsx`,
  `products/[id]/page.bugs.test.tsx`, `products/page.{a11y-low-contrast,perf,}.bugs.test.tsx`,
  `app/api/checkout/route.perf.bugs.test.ts`, `app/api/products/route.bugs.test.ts`,
  `app/api/session/cart/route.bugs.test.ts`, `components/auth/credentials-form.bugs.test.tsx`,
  `components/checkout/checkout-form.bugs.test.tsx`, `components/layout/site-header.bugs.test.tsx`,
  `components/products/catalog-pagination.bugs.test.tsx`, and `lib/**/**.bugs.test.ts`
  (account-service, cart-service, totals, pagination, query, coupon, format,
  checkout, order.idor, place-order).

## Appendix B — Incubyte reference, raw
- Fraunces 600 @ 84px, line-height 85.68px (1.02), colour rgb(1,77,67) — hero.
- Fraunces 400/600 @ 36–48px, colour rgb(10,10,13) — section heads.
- Inclusive Sans 400 @ 14px / 21px — body; buttons `padding: 10px 25px; border-radius: 842px`.
- Backgrounds by frequency: #FFFFFF (63), #EBFFF6 (40), #014D43 (35), #D3FE73 (19), #E8F7ED (15), #060A1E (6), #5DC6D6 (4), #EEF2E5 (3), #F9E4E8 (3).
