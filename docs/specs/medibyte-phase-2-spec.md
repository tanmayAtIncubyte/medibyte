# Spec: MediByte — Phase 2 (Catalog, Cart & Coupons)

## Overview
Phase 2 builds the customer-facing storefront on the Phase 1 foundation: browse/search/filter the catalog, view product detail, manage a cart with live totals, and apply coupons. **Everything ships CLEAN — no seeded bugs** (bugs are Phase 4, gated through `isBugActive`). Follow the established patterns: pages render as **Server Components** (fetch via `lib/data/*` accessors); keep real `/api/*` routes for mutations + the reads where Phase-4 bugs will live (hybrid data-fetching policy in `.claude/bee-architecture.local.md`). This is the storefront, so **visual realism matters** — it must look like a believable pharmacy.

Linear: parent **MED-7**. Slices map to **MED-11, MED-12, MED-13, MED-14**.

## Design
Produce a short design brief (`.claude/DESIGN.md`) and apply it: a clean, trustworthy pharmacy storefront built on the existing brand tokens/typography from Phase 1 (`lib/brand.ts`, `app/globals.css`). Accessible (labelled controls, focus states, sufficient contrast) and consistent across catalog/detail/cart. No generic AI-template look.

## Data
Expand `data/products.ts` to a richer, deterministic catalog (~30–40 products across several categories, OTC + Rx mix) so search/filter/sort/pagination are meaningful. Add `data/coupons.ts` (a few valid + at least one expired code). No DB, no runtime RNG.

---

## Slice 1 — Catalog browse + product detail  (MED-11)
Server-rendered catalog and detail pages.

- [ ] `/products` lists all products server-rendered (no client XHR for plain display); each item links to its detail page
- [ ] Each card shows name, price, and an OTC vs Prescription (Rx) indicator
- [ ] `/products/[id]` renders a product detail page (name, description, price, category, OTC/Rx, availability/stock) server-rendered via `findProductById`
- [ ] An unknown product id renders the styled not-found page (not a crash)
- [ ] Prescription (Rx) products are clearly marked as requiring a prescription on both list and detail
- [ ] `GET /api/products` and `GET /api/products/[id]` remain available as inspectable JSON endpoints
- [ ] Clean build + no console errors

## Slice 2 — Search, filter, sort & pagination  (MED-12)
Catalog refinement, URL-driven and server-rendered.

- [ ] Search products by name (substring, case-insensitive) via a query param
- [ ] Filter by category and by type (OTC/Rx)
- [ ] Sort by price (asc/desc) and by name
- [ ] Paginate results with a sensible page size and page navigation
- [ ] Search + filter + sort + page state live in the URL (shareable; server-rendered) and compose correctly together
- [ ] A no-results state is shown when nothing matches (not a blank page)
- [ ] Pagination total/counts reflect the active filter+search (not the unfiltered set)
- [ ] Logic (filter/sort/paginate) lives in pure, unit-tested helpers in `lib/`

## Slice 3 — Cart  (MED-13)
Cart over the Phase-1 in-memory per-session store.

- [ ] A customer can add a product to the cart from the catalog and/or detail page
- [ ] `/cart` shows line items: name, unit price, quantity, line total
- [ ] Quantity can be updated and an item removed; totals recompute
- [ ] Totals show a breakdown: subtotal, tax, and total (pure, unit-tested money math; round correctly)
- [ ] The cart persists for the session (in-memory store) and resets on restart, consistent with Phase 1
- [ ] The header reflects cart item count
- [ ] An empty-cart state is shown when there are no items
- [ ] Cart reads/writes go through inspectable `/api/*` endpoints (mutations), per the hybrid policy

## Slice 4 — Coupons  (MED-14)
Discount codes applied to the cart.

- [ ] Coupon seed data exists in `data/coupons.ts` with at least one valid and one expired code
- [ ] A customer can apply a coupon code at the cart
- [ ] A valid (non-expired) coupon applies its discount and the total reflects it
- [ ] An expired or unknown code is rejected with a clear message and no discount is applied
- [ ] The totals breakdown shows the discount line when a coupon is active
- [ ] A coupon can be removed/replaced and totals recompute
- [ ] Coupon validation + discount math live in pure, unit-tested helpers in `lib/`

---

## Out of Scope (Phase 2)
- Any seeded/active bugs — Phase 2 is a clean baseline; bugs are wired in Phase 4 via `isBugActive`.
- Checkout, orders, account, PHI/prescription-upload flow (Phase 3).
- Real payments. The full ~100-product / ~300-order dataset (Phase 2 expands products modestly; orders come in Phase 3).
- Our own e2e/axe suite, candidate docs, answer key, deployment (Phases 4–5).

## Technical Context
- **Stack:** Next.js App Router + TS + Tailwind + shadcn/ui (as Phase 1). No DB.
- **Patterns:** hybrid data-fetching (server-render pages via `lib/data/*`; `/api/*` for mutations + bug-relevant reads). Thin route handlers → pure `lib/` logic. Reuse Phase-1 pieces: `lib/data/products.ts`, `lib/data/session-store.ts`, `lib/auth/current-user.ts`, `components/layout/*`, shadcn primitives.
- **Keep it clean & admin-safe-ready:** do NOT wire any `isBugActive` buggy paths; leave the registry at `PROBE_NOOP`.
- **Risk:** LOW–MODERATE (customer-facing CRUD over in-memory state; money math must be correct).
