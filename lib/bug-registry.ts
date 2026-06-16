// The canonical list of every bug in MediByte. This file IS the answer key:
// each entry describes one deliberately-seeded defect and where it lives.
// `data/bug-flags.json` is seeded from these keys and `lib/bugs.ts` gates every
// buggy code path through them. The registry holds exactly the 45 seeded
// assessment bugs (the Phase-1 PROBE_NOOP engine probe was removed in Phase 4).

export type BugCategory =
  | "functional"
  | "accessibility"
  | "performance"
  | "security"
  | "ui"
  | "ux";

export type BugDifficulty = "easy" | "moderate" | "difficult" | "expert";

// How a reviewer would most naturally catch the defect once it is toggled on.
export type BugHowToSpot =
  | "eyeball"
  | "edge input"
  | "DevTools Network"
  | "a11y tool"
  | "keyboard"
  | "code review"
  | "cross-screen";

export type BugDefinition = {
  key: string;
  title: string;
  category: BugCategory;
  difficulty: BugDifficulty;
  location: string;
  hipaa: boolean;
  // Reviewer-facing enrichment (MED-29). Optional so older callers/tests that
  // construct a BugDefinition without them keep compiling.
  //
  // effect:    one line — what visibly breaks for the customer when the flag is ON.
  // where:     the route/screen a reviewer should open to observe it.
  // howToSpot: the primary way to catch it (eyeball / edge input / Network / a11y / keyboard / code).
  effect?: string;
  where?: string;
  howToSpot?: BugHowToSpot;
  // Internal/non-assessment marker. No entries currently use it (the Phase-1
  // PROBE_NOOP probe that did was removed in Phase 4), but listAssessmentBugs
  // still honors it so any future scaffolding can be hidden from the panel.
  internal?: boolean;
};

export const bugRegistry: readonly BugDefinition[] = [
  // --- Batch 1: Functional — Easy (8) ---
  {
    key: "FN_PRICE_DECIMALS",
    title: "Prices render with one decimal / no cent rounding",
    category: "functional",
    difficulty: "easy",
    location: "lib/format.ts (formatPrice) via product catalog + detail",
    hipaa: false,
    effect: "Prices show one decimal instead of cents (e.g. $10.5 not $10.49).",
    where: "/products and /products/[id]",
    howToSpot: "eyeball",
  },
  {
    key: "FN_PRICE_SORT_LEXICAL",
    title: "Price sort compares prices as strings (lexical)",
    category: "functional",
    difficulty: "easy",
    location: "lib/catalog/query.ts (sortProducts)",
    hipaa: false,
    effect: "Sorting by price orders lexically, so $10 sorts before $3.",
    where: "/products (sort: Price Low→High / High→Low)",
    howToSpot: "eyeball",
  },
  {
    key: "FN_PAGINATION_OFFBYONE",
    title: "Pagination window skips one item at the page boundary",
    category: "functional",
    difficulty: "easy",
    location: "lib/catalog/query.ts (queryCatalog page start)",
    hipaa: false,
    effect: "The first product is dropped and each page boundary skips one item.",
    where: "/products (paging across pages)",
    howToSpot: "cross-screen",
  },
  {
    key: "FN_CART_BADGE_LINES",
    title: "Header cart badge counts line items, not total quantity",
    category: "functional",
    difficulty: "easy",
    location: "components/layout/site-header.tsx",
    hipaa: false,
    effect: "Cart badge counts distinct lines, not total quantity (qty 3 shows 1).",
    where: "Site header (badge) vs /cart Subtotal",
    howToSpot: "cross-screen",
  },
  {
    key: "FN_INSTOCK_AT_ZERO",
    title: "Shows 'In stock' when stock is zero",
    category: "functional",
    difficulty: "easy",
    location: "lib/format.ts (stockLabel) via catalog card + detail",
    hipaa: false,
    effect: "A zero-stock product shows 'In stock' instead of 'Out of stock'.",
    where: "/products + /products/[id] (e.g. Daily Fiber Supplement Powder)",
    howToSpot: "eyeball",
  },
  {
    key: "FN_NORESULTS_BLANK",
    title: "No 'no results' message shown on an empty search",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/products/page.tsx",
    hipaa: false,
    effect: "An empty search renders a blank area with no guidance or clear-filters link.",
    where: "/products (search a term that matches nothing, e.g. 'zzzzz')",
    howToSpot: "eyeball",
  },
  {
    key: "FN_ORDER_DATE_RAW",
    title: "Order date shown as a raw ISO timestamp",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/orders/page.tsx (formatOrderDate)",
    hipaa: false,
    effect: "Order date shows a raw ISO string (2026-01-15T09:30:00.000Z) not a friendly date.",
    where: "/orders",
    howToSpot: "eyeball",
  },
  {
    key: "FN_TRIPWIRE_COPY",
    title: "Product detail copy contradicts the Rx/OTC badge (reading tripwire)",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/products/[id]/page.tsx",
    hipaa: false,
    effect: "An added sentence contradicts the Rx/OTC badge (Rx item claims no Rx needed, etc.).",
    where: "/products/[id] (description area)",
    howToSpot: "eyeball",
  },

  // --- Batch 1: Functional — Moderate (6) ---
  {
    key: "FN_QTY_NONPOSITIVE",
    title: "Cart quantity stepper accepts zero / negative quantities",
    category: "functional",
    difficulty: "moderate",
    location: "app/api/session/cart/route.ts (PATCH)",
    hipaa: false,
    effect: "PATCH persists a zero/negative quantity instead of removing the line.",
    where: "/cart (drop a line to 0) — PATCH /api/session/cart",
    howToSpot: "DevTools Network",
  },
  {
    key: "FN_CART_TOTAL_STALE",
    title: "Cart total does not recompute after a quantity change",
    category: "functional",
    difficulty: "moderate",
    location: "lib/cart/cart-service.ts (getCartView) via /cart",
    hipaa: false,
    effect: "Total ignores the first line's quantity, so it disagrees with the subtotal.",
    where: "/cart (raise the first line's quantity, watch Order summary)",
    howToSpot: "cross-screen",
  },
  {
    key: "FN_TAX_FLOOR",
    title: "Tax is floored to cents instead of rounded",
    category: "functional",
    difficulty: "moderate",
    location: "lib/cart/totals.ts (computeCartTotals)",
    hipaa: false,
    effect: "Tax is floored down a cent (e.g. $0.80 instead of $0.81).",
    where: "/cart, /checkout (Tax row)",
    howToSpot: "edge input",
  },
  {
    key: "FN_EXPIRED_COUPON_OK",
    title: "Expired coupon still applies",
    category: "functional",
    difficulty: "moderate",
    location: "lib/coupons/coupon.ts (validateCoupon) via cart-service",
    hipaa: false,
    effect: "An expired coupon is accepted and its discount applies.",
    where: "/cart (apply expired code SPRING2023)",
    howToSpot: "edge input",
  },
  {
    key: "FN_OOS_ADDABLE",
    title: "Out-of-stock item can still be added to the cart",
    category: "functional",
    difficulty: "moderate",
    location: "app/api/session/cart/route.ts (POST)",
    hipaa: false,
    effect: "Adding a 0-stock item returns 201 and the item lands in the cart (should be 409).",
    where: "/products → add a 0-stock item — POST /api/session/cart",
    howToSpot: "DevTools Network",
  },
  {
    key: "FN_POSTAL_UNVALIDATED",
    title: "Postal code skips required-field validation at checkout",
    category: "functional",
    difficulty: "moderate",
    location: "lib/orders/checkout.ts (validateShipping) via /api/checkout",
    hipaa: false,
    effect: "Checkout is accepted with a blank postal code (server skips the required check).",
    where: "/checkout (submit with postal code blank) — POST /api/checkout",
    howToSpot: "edge input",
  },

  // --- Batch 2: Functional — Difficult (5) ---
  {
    key: "FN_TAX_BEFORE_DISCOUNT",
    title: "Tax computed on the pre-discount subtotal (overcharge)",
    category: "functional",
    difficulty: "difficult",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
    effect: "With a coupon, tax is charged on the pre-discount subtotal, overcharging the customer.",
    where: "/cart, /checkout (apply a coupon, e.g. SAVE10)",
    howToSpot: "edge input",
  },
  {
    key: "FN_COUPON_NEGATIVE",
    title: "Discount not clamped to subtotal → negative total",
    category: "functional",
    difficulty: "difficult",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
    effect:
      "Discount is not clamped to subtotal, so the total can go negative. Note: needs a coupon worth more than the cart subtotal to actually observe a negative total; default seed coupons won't trigger it without a reviewer-seeded high-value coupon.",
    where: "/cart, /checkout (fixed-dollar coupon > subtotal)",
    howToSpot: "edge input",
  },
  {
    key: "FN_FILTER_LOST_ON_PAGE",
    title: "Paginating drops the active filter/search",
    category: "functional",
    difficulty: "difficult",
    location: "components/products/catalog-pagination.tsx via /products",
    hipaa: false,
    effect: "Page links drop q/category/type/sort, so paging lands on the unfiltered catalog.",
    where: "/products (apply a filter, then click Next / page 2)",
    howToSpot: "cross-screen",
  },
  {
    key: "FN_PAGE_COUNT_UNFILTERED",
    title: "Page count / total uses the unfiltered catalog",
    category: "functional",
    difficulty: "difficult",
    location: "lib/catalog/query.ts (queryCatalog) via /products",
    hipaa: false,
    effect: "'Showing N of M' and the pager count the full catalog; later pages render empty.",
    where: "/products (filter to a small result set)",
    howToSpot: "cross-screen",
  },
  {
    key: "FN_OVERSELL",
    title: "Order can exceed available stock (no stock check)",
    category: "functional",
    difficulty: "difficult",
    location: "lib/orders/place-order.ts via /api/checkout",
    hipaa: false,
    effect: "Stock check is skipped, so an order for more units than exist still succeeds.",
    where: "/checkout (order a quantity above stock) — POST /api/checkout",
    howToSpot: "edge input",
  },

  // --- Batch 2: Functional — Expert (3) ---
  {
    key: "FN_CONCURRENT_DOUBLESPEND",
    title: "Concurrent orders double-spend the same stock (lost atomicity)",
    category: "functional",
    difficulty: "expert",
    location: "lib/orders/place-order.ts (reserveStockRacy) via /api/checkout",
    hipaa: false,
    effect:
      "Two concurrent orders for the last units both succeed (stock double-spent). Note: a race — observable only via two parallel checkout requests or code review, not a single action.",
    where: "POST /api/checkout (two parallel requests for the last units)",
    howToSpot: "code review",
  },
  {
    key: "FN_TOTAL_ROUNDING_EDGE",
    title: "Wrong total only at specific coupon+tax values (rounding-order edge)",
    category: "functional",
    difficulty: "expert",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
    effect: "Total is off by a cent only at specific subtotal+coupon values; most carts are correct.",
    where: "/cart, /checkout (edge subtotal + percent coupon)",
    howToSpot: "edge input",
  },
  {
    key: "FN_PARTIAL_CHECKOUT",
    title: "Order created but the cart is not cleared (inconsistent state)",
    category: "functional",
    difficulty: "expert",
    location: "lib/orders/place-order.ts via /api/checkout",
    hipaa: false,
    effect: "After a successful order, the cart is left full (same items linger), inviting a duplicate buy.",
    where: "After checkout: /orders shows it but /cart still holds the items",
    howToSpot: "cross-screen",
  },

  // --- Batch 3: Accessibility (3) ---
  {
    key: "A11Y_INPUT_NO_LABEL",
    title: "Coupon code input loses its programmatic label (no accessible name)",
    category: "accessibility",
    difficulty: "easy",
    location: "components/cart/coupon-form.tsx via /cart (flag resolved on the cart page)",
    hipaa: false,
    effect: "Coupon input has no accessible name (label removed, no aria-label) — axe 'label' rule.",
    where: "/cart (Coupon code input in Order summary)",
    howToSpot: "a11y tool",
  },
  {
    key: "A11Y_LOW_CONTRAST",
    title: "Catalog price text rendered below the WCAG AA contrast threshold",
    category: "accessibility",
    difficulty: "easy",
    location: "components/products/product-catalog.tsx via /products (flag resolved on the products page)",
    hipaa: false,
    effect: "Card price renders in a near-background gray below WCAG AA 4.5:1 — axe 'color-contrast' rule.",
    where: "/products (product card price)",
    howToSpot: "a11y tool",
  },
  {
    key: "A11Y_NO_KEYBOARD_FOCUS",
    title: "Cart quantity steppers are not keyboard-operable / have no focus ring",
    category: "accessibility",
    difficulty: "moderate",
    location: "components/cart/cart-line-controls.tsx via /cart (flag resolved on the cart page)",
    hipaa: false,
    effect: "Steppers render as plain spans: skipped in the tab order, no keyboard activation, no focus ring.",
    where: "/cart (Tab to the −/+ quantity steppers)",
    howToSpot: "keyboard",
  },

  // --- Batch 4: Performance / Latency (5, simulated) ---
  {
    key: "PERF_SLOW_CHECKOUT",
    title: "Checkout request hangs ~2s with no pending feedback (injected latency)",
    category: "performance",
    difficulty: "moderate",
    location: "app/api/checkout/route.ts (flag resolved at the route boundary)",
    hipaa: false,
    effect: "POST /api/checkout stalls ~2s with no loading feedback; the submit looks unresponsive.",
    where: "/checkout (submit) — POST /api/checkout",
    howToSpot: "DevTools Network",
  },
  {
    key: "PERF_PRODUCTS_TTFB",
    title: "Products page blocks ~1.5s server-side before render, no loading skeleton",
    category: "performance",
    difficulty: "moderate",
    location: "app/(storefront)/products/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "The products document blocks ~1.5s TTFB; the tab sits blank with no skeleton.",
    where: "/products (initial navigation)",
    howToSpot: "DevTools Network",
  },
  {
    key: "PERF_CART_WATERFALL",
    title: "Cart re-fetches each line's product one-by-one (sequential N+1 waterfall)",
    category: "performance",
    difficulty: "difficult",
    location: "components/cart/cart-line-prefetch.tsx via /cart (flag resolved on the cart page)",
    hipaa: false,
    effect: "Cart fires one GET /api/products/[id] per line sequentially (N+1) for data already present.",
    where: "/cart with several distinct lines",
    howToSpot: "DevTools Network",
  },
  {
    key: "PERF_OVERFETCH_PAYLOAD",
    title: "GET /api/products returns a bloated, duplicated payload the page never uses",
    category: "performance",
    difficulty: "moderate",
    location: "app/api/products/route.ts (flag resolved at the route boundary)",
    hipaa: false,
    effect: "Each product is padded with large unused/duplicated fields, bloating the response size.",
    where: "GET /api/products",
    howToSpot: "DevTools Network",
  },
  {
    key: "PERF_NO_CACHE",
    title: "Catalog API forces no-store so every navigation refetches everything",
    category: "performance",
    difficulty: "moderate",
    location: "app/api/products/route.ts (Cache-Control) (flag resolved at the route boundary)",
    hipaa: false,
    effect: "Response carries Cache-Control: no-store, so the catalog refetches on every navigation.",
    where: "GET /api/products (repeat navigations)",
    howToSpot: "DevTools Network",
  },

  // --- Batch 5: Security / Transport (6, HIPAA-tagged where PHI) ---
  {
    key: "SEC_IDOR_ORDER",
    title: "Order detail drops the ownership check (IDOR: view another customer's order + PHI)",
    category: "security",
    difficulty: "difficult",
    location:
      "app/(storefront)/orders/[id]/page.tsx + lib/data/orders.ts (getOrderForViewer) via lib/orders/order.ts (findOrderForViewer)",
    hipaa: true,
    effect: "Ownership check is bypassed, so any order id renders another customer's order + PHI (IDOR).",
    where: "/orders/[id] (change the id to one you don't own)",
    howToSpot: "edge input",
  },
  {
    key: "SEC_PHI_OVERFETCH",
    title: "Account API over-fetches PHI the view never needs (chain target of the IDOR)",
    category: "security",
    difficulty: "difficult",
    location: "app/api/account/route.ts (GET) via lib/account/account-service.ts (readAccountForApi)",
    hipaa: true,
    effect: "Account response is padded with PHI the UI never shows (SSN, DOB, diagnoses, med history).",
    where: "/account — GET /api/account (response body)",
    howToSpot: "DevTools Network",
  },
  {
    key: "SEC_MISSING_ADMIN_AUTH",
    title: "Admin bug-flags API drops its admin guard (a customer can read/toggle flags)",
    category: "security",
    difficulty: "difficult",
    location: "app/api/admin/bug-flags/route.ts (flag resolved at the route boundary)",
    hipaa: false,
    effect: "Non-admins can read and toggle flags (200 + flag map instead of 403) — privilege escalation.",
    where: "GET/POST /api/admin/bug-flags as a non-admin",
    howToSpot: "DevTools Network",
  },
  {
    key: "SEC_CREDS_IN_URL",
    title: "Login sends credentials in the URL query string (GET) instead of the POST body",
    category: "security",
    difficulty: "moderate",
    location: "components/auth/credentials-form.tsx via app/login/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "Login submits a GET with ?email=…&password=…, exposing creds in the URL/history/logs.",
    where: "/login (sign in) — GET /api/auth/login",
    howToSpot: "DevTools Network",
  },
  {
    key: "SEC_TOKEN_LOCALSTORAGE",
    title: "Client copies the session identity into localStorage (XSS-exfiltratable)",
    category: "security",
    difficulty: "moderate",
    location: "components/auth/credentials-form.tsx via app/login/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "On login the identity is also written to localStorage (mb_identity), readable by any XSS.",
    where: "/login then DevTools → Application → Local Storage",
    howToSpot: "DevTools Network",
  },
  {
    key: "SEC_PRICE_TAMPER",
    title: "Checkout trusts a client-supplied total instead of recomputing server-side",
    category: "security",
    difficulty: "difficult",
    location: "app/api/checkout/route.ts + lib/orders/place-order.ts (trustClientTotal)",
    hipaa: false,
    effect: "Server trusts a client clientTotal, so a tampered request underpays while still placing the order.",
    where: "POST /api/checkout with a tampered clientTotal field",
    howToSpot: "DevTools Network",
  },

  // --- Batch 6: UI antipattern (4) + UX (5) ---
  {
    key: "UI_DESTRUCTIVE_NO_CONFIRM",
    title: "Cart remove is instant & destructive with no confirmation",
    category: "ui",
    difficulty: "easy",
    location: "components/cart/cart-line-controls.tsx via app/(storefront)/cart/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "Remove deletes the line instantly with no confirmation — an accidental click is unrecoverable.",
    where: "/cart (click Remove on a line)",
    howToSpot: "eyeball",
  },
  {
    key: "UI_NO_SUBMIT_FEEDBACK",
    title: "Checkout submit gives no visible feedback (no pending/disabled state)",
    category: "ui",
    difficulty: "easy",
    location: "components/checkout/checkout-form.tsx via app/(storefront)/checkout/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "Place-order button stays enabled with no spinner/label change while submitting (invites double-clicks).",
    where: "/checkout (click Place order)",
    howToSpot: "eyeball",
  },
  {
    key: "UI_MISLEADING_ICON",
    title: "Cart remove button shows a misleading (non-destructive) icon",
    category: "ui",
    difficulty: "easy",
    location: "components/cart/cart-line-controls.tsx via app/(storefront)/cart/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "The destructive Remove button shows a friendly Heart icon instead of a trash can.",
    where: "/cart (Remove control)",
    howToSpot: "eyeball",
  },
  {
    key: "UI_FORM_CLEARS_ON_ERROR",
    title: "A checkout validation error wipes the entered fields",
    category: "ui",
    difficulty: "moderate",
    location: "components/checkout/checkout-form.tsx via app/(storefront)/checkout/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "A validation error resets the whole form, wiping every entered field, forcing a full re-type.",
    where: "/checkout (submit with a required field blank)",
    howToSpot: "edge input",
  },
  {
    key: "UX_VAGUE_ERROR",
    title: "Checkout error path shows a vague 'Something went wrong' with no next step",
    category: "ux",
    difficulty: "easy",
    location: "components/checkout/checkout-form.tsx via app/(storefront)/checkout/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "Every checkout error collapses to a generic 'Something went wrong.' with no reason or next step.",
    where: "/checkout (force any checkout error)",
    howToSpot: "eyeball",
  },
  {
    key: "UX_NO_ORDER_CONFIRM",
    title: "Order confirmation gives no clear success cue after placing the order",
    category: "ux",
    difficulty: "easy",
    location: "app/(storefront)/orders/[id]/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "The 'Order placed — thank you!' success banner is suppressed; no clear 'it worked' cue.",
    where: "/orders/[id]?placed=1 (after checkout)",
    howToSpot: "eyeball",
  },
  {
    key: "UX_SURPRISE_TAX",
    title: "Tax is hidden on the cart and only appears at the final checkout step",
    category: "ux",
    difficulty: "moderate",
    location: "app/(storefront)/cart/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "Cart hides the tax line and total; tax first appears at checkout — a surprise charge at the end.",
    where: "/cart then /checkout (compare summaries)",
    howToSpot: "cross-screen",
  },
  {
    key: "UX_LOST_CHECKOUT_PROGRESS",
    title: "Back navigation from checkout loses entered shipping/payment data",
    category: "ux",
    difficulty: "moderate",
    location: "components/checkout/checkout-form.tsx via app/(storefront)/checkout/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "On a bfcache Back restore the checkout form resets, losing everything the customer typed.",
    where: "/checkout (fill, navigate away, press Back)",
    howToSpot: "edge input",
  },
  {
    key: "UX_NO_PAGE_TOTAL",
    title: "Catalog pagination shows no total pages / results indicator",
    category: "ux",
    difficulty: "easy",
    location: "components/products/catalog-pagination.tsx via app/(storefront)/products/page.tsx (flag resolved on the page)",
    hipaa: false,
    effect: "The 'Page X of Y' indicator is removed, leaving bare page links with no sense of total.",
    where: "/products (the pager)",
    howToSpot: "eyeball",
  },
] as const;

// Type-safe key union derived from the registry, so callers get autocomplete
// and compile-time checking against the canonical list.
export type BugKey = (typeof bugRegistry)[number]["key"];

export function listBugs(): BugDefinition[] {
  return bugRegistry.map((bug) => ({ ...bug }));
}

// The 45 real assessment bugs only — excludes any internal/no-op scaffolding
// entries (marked internal: true). The admin panel uses this so reviewers only
// see togglable assessment defects, never engine scaffolding.
export function listAssessmentBugs(): BugDefinition[] {
  return bugRegistry.filter((bug) => bug.internal !== true).map((bug) => ({ ...bug }));
}

export function findBugByKey(key: string): BugDefinition | null {
  const bug = bugRegistry.find((candidate) => candidate.key === key);
  return bug ? { ...bug } : null;
}

export function listBugsByCategory(category: BugCategory): BugDefinition[] {
  return bugRegistry.filter((bug) => bug.category === category).map((bug) => ({ ...bug }));
}

export function listBugsByDifficulty(difficulty: BugDifficulty): BugDefinition[] {
  return bugRegistry.filter((bug) => bug.difficulty === difficulty).map((bug) => ({ ...bug }));
}
