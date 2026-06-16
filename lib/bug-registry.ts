// The canonical list of every bug in MediByte. This file IS the answer key:
// each entry describes one deliberately-seeded defect and where it lives.
// `data/bug-flags.json` is seeded from these keys and `lib/bugs.ts` gates every
// buggy code path through them. No real bugs are seeded in Phase 1 — the single
// PROBE_NOOP entry exists only to prove the toggle engine end-to-end and is
// removed (or replaced by real bugs) in Phase 4.

export type BugCategory =
  | "functional"
  | "accessibility"
  | "performance"
  | "security"
  | "ui"
  | "ux";

export type BugDifficulty = "easy" | "moderate" | "difficult" | "expert";

export type BugDefinition = {
  key: string;
  title: string;
  category: BugCategory;
  difficulty: BugDifficulty;
  location: string;
  hipaa: boolean;
};

export const bugRegistry: readonly BugDefinition[] = [
  {
    key: "PROBE_NOOP",
    title: "Phase-1 engine probe (no-op, not a real bug)",
    category: "functional",
    difficulty: "easy",
    location: "lib/bugs.ts (describeProbe demo)",
    hipaa: false,
  },

  // --- Batch 1: Functional — Easy (8) ---
  {
    key: "FN_PRICE_DECIMALS",
    title: "Prices render with one decimal / no cent rounding",
    category: "functional",
    difficulty: "easy",
    location: "lib/format.ts (formatPrice) via product catalog + detail",
    hipaa: false,
  },
  {
    key: "FN_PRICE_SORT_LEXICAL",
    title: "Price sort compares prices as strings (lexical)",
    category: "functional",
    difficulty: "easy",
    location: "lib/catalog/query.ts (sortProducts)",
    hipaa: false,
  },
  {
    key: "FN_PAGINATION_OFFBYONE",
    title: "Pagination window skips one item at the page boundary",
    category: "functional",
    difficulty: "easy",
    location: "lib/catalog/query.ts (queryCatalog page start)",
    hipaa: false,
  },
  {
    key: "FN_CART_BADGE_LINES",
    title: "Header cart badge counts line items, not total quantity",
    category: "functional",
    difficulty: "easy",
    location: "components/layout/site-header.tsx",
    hipaa: false,
  },
  {
    key: "FN_INSTOCK_AT_ZERO",
    title: "Shows 'In stock' when stock is zero",
    category: "functional",
    difficulty: "easy",
    location: "lib/format.ts (stockLabel) via catalog card + detail",
    hipaa: false,
  },
  {
    key: "FN_NORESULTS_BLANK",
    title: "No 'no results' message shown on an empty search",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/products/page.tsx",
    hipaa: false,
  },
  {
    key: "FN_ORDER_DATE_RAW",
    title: "Order date shown as a raw ISO timestamp",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/orders/page.tsx (formatOrderDate)",
    hipaa: false,
  },
  {
    key: "FN_TRIPWIRE_COPY",
    title: "Product detail copy contradicts the Rx/OTC badge (reading tripwire)",
    category: "functional",
    difficulty: "easy",
    location: "app/(storefront)/products/[id]/page.tsx",
    hipaa: false,
  },

  // --- Batch 1: Functional — Moderate (6) ---
  {
    key: "FN_QTY_NONPOSITIVE",
    title: "Cart quantity stepper accepts zero / negative quantities",
    category: "functional",
    difficulty: "moderate",
    location: "app/api/session/cart/route.ts (PATCH)",
    hipaa: false,
  },
  {
    key: "FN_CART_TOTAL_STALE",
    title: "Cart total does not recompute after a quantity change",
    category: "functional",
    difficulty: "moderate",
    location: "lib/cart/cart-service.ts (getCartView) via /cart",
    hipaa: false,
  },
  {
    key: "FN_TAX_FLOOR",
    title: "Tax is floored to cents instead of rounded",
    category: "functional",
    difficulty: "moderate",
    location: "lib/cart/totals.ts (computeCartTotals)",
    hipaa: false,
  },
  {
    key: "FN_EXPIRED_COUPON_OK",
    title: "Expired coupon still applies",
    category: "functional",
    difficulty: "moderate",
    location: "lib/coupons/coupon.ts (validateCoupon) via cart-service",
    hipaa: false,
  },
  {
    key: "FN_OOS_ADDABLE",
    title: "Out-of-stock item can still be added to the cart",
    category: "functional",
    difficulty: "moderate",
    location: "app/api/session/cart/route.ts (POST)",
    hipaa: false,
  },
  {
    key: "FN_POSTAL_UNVALIDATED",
    title: "Postal code skips required-field validation at checkout",
    category: "functional",
    difficulty: "moderate",
    location: "lib/orders/checkout.ts (validateShipping) via /api/checkout",
    hipaa: false,
  },

  // --- Batch 2: Functional — Difficult (5) ---
  {
    key: "FN_TAX_BEFORE_DISCOUNT",
    title: "Tax computed on the pre-discount subtotal (overcharge)",
    category: "functional",
    difficulty: "difficult",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
  },
  {
    key: "FN_COUPON_NEGATIVE",
    title: "Discount not clamped to subtotal → negative total",
    category: "functional",
    difficulty: "difficult",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
  },
  {
    key: "FN_FILTER_LOST_ON_PAGE",
    title: "Paginating drops the active filter/search",
    category: "functional",
    difficulty: "difficult",
    location: "components/products/catalog-pagination.tsx via /products",
    hipaa: false,
  },
  {
    key: "FN_PAGE_COUNT_UNFILTERED",
    title: "Page count / total uses the unfiltered catalog",
    category: "functional",
    difficulty: "difficult",
    location: "lib/catalog/query.ts (queryCatalog) via /products",
    hipaa: false,
  },
  {
    key: "FN_OVERSELL",
    title: "Order can exceed available stock (no stock check)",
    category: "functional",
    difficulty: "difficult",
    location: "lib/orders/place-order.ts via /api/checkout",
    hipaa: false,
  },

  // --- Batch 2: Functional — Expert (3) ---
  {
    key: "FN_CONCURRENT_DOUBLESPEND",
    title: "Concurrent orders double-spend the same stock (lost atomicity)",
    category: "functional",
    difficulty: "expert",
    location: "lib/orders/place-order.ts (reserveStockRacy) via /api/checkout",
    hipaa: false,
  },
  {
    key: "FN_TOTAL_ROUNDING_EDGE",
    title: "Wrong total only at specific coupon+tax values (rounding-order edge)",
    category: "functional",
    difficulty: "expert",
    location: "lib/cart/totals.ts (computeCartTotals) via /cart, /checkout, /api/checkout",
    hipaa: false,
  },
  {
    key: "FN_PARTIAL_CHECKOUT",
    title: "Order created but the cart is not cleared (inconsistent state)",
    category: "functional",
    difficulty: "expert",
    location: "lib/orders/place-order.ts via /api/checkout",
    hipaa: false,
  },

  // --- Batch 3: Accessibility (3) ---
  {
    key: "A11Y_INPUT_NO_LABEL",
    title: "Coupon code input loses its programmatic label (no accessible name)",
    category: "accessibility",
    difficulty: "easy",
    location: "components/cart/coupon-form.tsx via /cart (flag resolved on the cart page)",
    hipaa: false,
  },
  {
    key: "A11Y_LOW_CONTRAST",
    title: "Catalog price text rendered below the WCAG AA contrast threshold",
    category: "accessibility",
    difficulty: "easy",
    location: "components/products/product-catalog.tsx via /products (flag resolved on the products page)",
    hipaa: false,
  },
  {
    key: "A11Y_NO_KEYBOARD_FOCUS",
    title: "Cart quantity steppers are not keyboard-operable / have no focus ring",
    category: "accessibility",
    difficulty: "moderate",
    location: "components/cart/cart-line-controls.tsx via /cart (flag resolved on the cart page)",
    hipaa: false,
  },
] as const;

// Type-safe key union derived from the registry, so callers get autocomplete
// and compile-time checking against the canonical list.
export type BugKey = (typeof bugRegistry)[number]["key"];

export function listBugs(): BugDefinition[] {
  return bugRegistry.map((bug) => ({ ...bug }));
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
