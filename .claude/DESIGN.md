# MediByte — Phase 2 Design Brief (Storefront)

## Goal
A clean, trustworthy, modern pharmacy storefront. It must read as a believable
commercial product (think a polished consumer-health e-commerce site), not a
generic AI/Tailwind template, so that Phase-4 bugs hide naturally. Built
entirely on the Phase-1 brand tokens — no new color system.

## Foundations (reuse, do not reinvent)
- **Tokens:** the existing oklch CSS variables in `app/globals.css`. Primary is a
  calm medical **teal** (`--primary: oklch(0.52 0.11 174)`); secondary/accent are
  tinted teals. Keep neutrals for text/borders. No new palette.
- **Type:** Geist (sans) for body, `font-heading` (also Geist) for headings.
  Headings: bold, tight tracking. Body: `text-muted-foreground` for secondary text.
- **Radius/elevation:** rounded-xl/2xl cards, `border-border`, `shadow-sm`. Soft,
  not flashy.
- **Primitives:** shadcn `Button`, `Input`; lucide-react icons (already installed).

## Storefront language
- **OTC vs Rx is a first-class signal.** OTC = neutral/secondary "Over the counter"
  pill. Rx = primary-tinted "Prescription" pill with a `Pill`/`FileText` icon and an
  explicit "Requires a prescription" note on cards and detail. This is a trust cue and
  a future bug surface, so it must be consistent everywhere.
- **Price** is prominent, `font-heading`, tabular feel via `tabular-nums`.
- **Stock/availability** shown plainly: "In stock", "Low stock (N left)", "Out of stock".

## Pages
- **/products (catalog):** sticky-feeling toolbar (search input, category select,
  type select, sort select) above a responsive card grid (1 / 2 / 3 cols). Result
  count + active-filter summary. Pagination footer with prev/next + numbered pages.
  Empty/no-results state with a reset link. Every control has a visible `<label>`.
- **/products/[id] (detail):** two-column on desktop — left: large product "panel"
  (icon-led placeholder, type badge); right: name, category, price, availability,
  prescription notice, quantity stepper + Add to cart. Description below. Back link.
- **/cart:** line-item list (name, unit price, qty stepper, line total, remove),
  order-summary card (subtotal, discount line when a coupon is active, tax, total),
  coupon form (apply / remove with inline validation message). Empty-cart state with
  a CTA to browse.

## Interactivity (client components only where needed)
- Add-to-cart button, quantity stepper, remove button, coupon form. Everything else
  (catalog grid, detail content, summary numbers) is server-rendered.

## Accessibility
- All form controls have associated `<label>`s (or `aria-label`).
- Inherit shadcn `focus-visible` rings (already strong). Don't remove outlines.
- Status/validation messages use `role="status"` / `role="alert"`.
- Color is never the sole signal (Rx also has text + icon; stock has text).
- Sufficient contrast: primary teal on white, foreground text on card.

## Anti-generic checklist
- Distinct OTC/Rx visual system rather than identical cards.
- Real domain copy (pharmacist-reviewed, prescription required, dosage counts).
- Considered empty/no-result/error states, not blank screens.
