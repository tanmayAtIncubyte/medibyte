import type { Product } from "@/data/products";

// ---------------------------------------------------------------------------
// SIMULATED performance defects (Phase 4, Batch 4).
//
// These helpers exist so the performance bugs are observable in the DevTools
// Network/Performance tab WITHOUT actually degrading the real app: every path
// here is reached only behind a bug flag (resolved at the route/page boundary,
// admin always clean). The clean default never calls these.
//
// Timing bugs are kept as small, named, gated functions so the toggle tests can
// assert the buggy branch is *taken* (the delay/bloat path is selected) rather
// than measuring wall-clock time.
// ---------------------------------------------------------------------------

/** Default injected delay for the slow-checkout defect (~2s). */
export const SLOW_CHECKOUT_DELAY_MS = 2000;

/** Default injected delay for the slow products-page TTFB defect (~1.5s). */
export const PRODUCTS_TTFB_DELAY_MS = 1500;

/**
 * Resolves after `ms` milliseconds. Used to inject artificial server-side
 * latency for `PERF_SLOW_CHECKOUT` and `PERF_PRODUCTS_TTFB`. Pure timer; no side
 * effects beyond waiting.
 */
export function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `PERF_OVERFETCH_PAYLOAD`: returns a deliberately bloated version of the
 * product list far larger than the catalog page needs — the real lean fields
 * plus a large block of unused, duplicated data on every item. The clean path
 * returns the lean list untouched.
 *
 * Kept pure (input list → bloated list) so the toggle test can assert the
 * payload is bloated (extra keys / larger serialized size) without HTTP timing.
 */
export function bloatProductsPayload(products: readonly Product[]): unknown[] {
  return products.map((product) => ({
    ...product,
    // Unused fields the catalog grid never reads — pure overfetch.
    _raw: product,
    _duplicate: { ...product },
    _description_long: product.description.repeat(50),
    _seoKeywords: Array.from({ length: 100 }, (_, i) => `${product.name}-kw-${i}`),
    _auditTrail: Array.from({ length: 50 }, (_, i) => ({
      at: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      note: `synthetic audit entry ${i} for ${product.id}`,
    })),
  }));
}
