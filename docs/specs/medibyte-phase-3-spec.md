# Spec: MediByte — Phase 3 (Checkout, Orders & Account)

## Overview
Phase 3 completes the customer journey on top of Phases 1–2: turn a cart into an order via checkout (shipping PII + the prescription/health flow for Rx items + mock payment), let customers view their order history & detail, and manage their account (profile, addresses, insurance). This is the **PHI-heavy** phase — prescriptions and insurance are the sensitive data that the Phase-4 security/HIPAA bugs will later target — so build it **clean and correctly access-controlled** (a customer can only see their own orders; the IDOR/PHI-exposure vulnerabilities are Phase-4 toggles, NOT baked in here).

Everything ships CLEAN — no seeded bugs, registry stays at `PROBE_NOOP`. Follow the established patterns: Server Components render pages via `lib/*` accessors; mutations go through inspectable `/api/*` routes (hybrid policy). The whole app is already gated behind login (Phase-1-polish), so every session has a real customer/admin role.

Linear: parent **MED-8**. Slices map to **MED-18, MED-19, MED-20, MED-21**.

## Data
- Add `data/orders.ts` with a few deterministic **historical orders for the seed customers** (dana/omar) so `/orders` has content on a fresh login and Phase-4 can target cross-customer access. Orders include items, totals snapshot, shipping address (PII), and prescription/health info (PHI) for any Rx items.
- Orders created at checkout live in the **in-memory per-session store** (consistent with Phase 1/2; reset on restart), merged with the seed orders for the current user.
- Account profile/address/insurance edits are in-memory per session too.

---

## Slice 1 — Checkout & place order  (MED-18)
Cart → order.

- [ ] `/checkout` is reachable from the cart when it has items; an empty cart redirects/blocks with a clear message
- [ ] Customer enters a shipping address (PII: name, street, city, region, postal, country) with validation of required fields
- [ ] A **mock** payment step (no real processing) — clearly non-real; a basic card-ish form or a "pay" action
- [ ] Placing the order creates an Order (items + price snapshot + shipping + totals) in the session store and clears the cart
- [ ] An order confirmation is shown (order id + summary)
- [ ] Checkout reads/writes go through inspectable `/api/*`; order creation logic is pure + unit-tested
- [ ] Totals on the order match the cart totals (subtotal/tax/discount/total) at time of purchase

## Slice 2 — Prescription / health info for Rx items  (MED-19)
The PHI capture flow.

- [ ] When the cart contains Rx (prescription) products, checkout requires prescription/health details for them (PHI: e.g. prescribing doctor, prescription number, date of birth, condition/notes as appropriate)
- [ ] OTC-only carts do NOT require the prescription step
- [ ] The captured PHI is attached to the created order
- [ ] PHI fields are validated (required when an Rx item is present)
- [ ] PHI is handled server-side; it is not leaked into URLs/logs (clean baseline — exposure bugs are Phase-4 toggles)
- [ ] PHI capture/validation logic is pure + unit-tested

## Slice 3 — Orders history & detail  (MED-20)
View past orders.

- [ ] `/orders` lists the current customer's orders (seed + session-created), newest first, with id/date/total/status
- [ ] `/orders/[id]` shows full order detail: items, totals breakdown, shipping address, and prescription/health info for Rx items
- [ ] **Access control (clean baseline):** a customer can only view their OWN orders; requesting another customer's order id is denied (404/403) — the ownership check is enforced (the IDOR bug that removes it is a Phase-4 toggle, do NOT pre-build it)
- [ ] An unknown order id → styled not-found
- [ ] Admin can view orders appropriately (e.g. via existing admin areas) without breaking the customer ownership rule
- [ ] Order lookup + ownership logic is pure + unit-tested

## Slice 4 — Account  (MED-21)
Manage profile + sensitive info.

- [ ] `/account` shows the logged-in customer's profile (name, email)
- [ ] Saved addresses (PII) can be viewed and edited/added (in-memory per session)
- [ ] Insurance information (PHI: provider, member id, group) can be viewed and edited
- [ ] Edits validate and persist for the session; reset on restart (consistent with the data layer)
- [ ] A customer only sees/edits their own account data (access-controlled, clean)
- [ ] Account read/update goes through inspectable `/api/*`; update logic is pure + unit-tested

---

## Out of Scope (Phase 3)
- Any seeded/active bugs — clean baseline; Phase-4 wires bugs (incl. IDOR on `/orders/[id]`, PHI over-fetch/leak, missing access control) via `isBugActive`.
- Real payments / real PHI / real insurance integrations.
- The full ~300-order dataset (Phase 3 seeds only a few historical orders per seed customer).
- Our own e2e/axe suite, candidate docs, answer key, deployment (Phases 4–5).

## Technical Context
- **Stack/patterns:** as Phases 1–2. Hybrid data-fetching; thin route handlers → pure `lib/` logic. App is gated behind login (`requireUser()` in `lib/auth/guards.ts`); `getCurrentUser()` gives the current customer.
- **Reuse:** `lib/data/session-store.ts` (extend for orders + account state), `lib/cart/*` (cart + totals snapshot at checkout), `lib/data/products.ts`, `lib/auth/*`, `components/*` + `.claude/DESIGN.md` for consistent UI, shadcn primitives.
- **Keep clean & access-controlled:** enforce per-customer ownership on orders/account; do NOT wire any `isBugActive` paths; leave the registry at `PROBE_NOOP`.
- **Risk:** MODERATE — handles PHI/PII and money snapshots; ownership checks and totals correctness matter and are the clean baseline the Phase-4 bugs will toggle against.
