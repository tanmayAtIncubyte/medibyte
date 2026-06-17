"use client";

import { useEffect } from "react";

/**
 * PERF_CART_WATERFALL (simulated): when `waterfall` is on, this client island
 * re-fetches every cart line's product ONE AT A TIME, sequentially, from
 * `/api/products/[id]` — an N+1 waterfall — even though the server component
 * already rendered the cart with all the product data it needs. The result is
 * discarded; the only effect is the chain of per-item requests, observable as a
 * staircase waterfall in the DevTools Network tab.
 *
 * The cart page resolves the flag (it has the user) and passes the boolean in,
 * so admins / flag-off mount this with `waterfall={false}` and it makes ZERO
 * extra requests — the data already on the page is used directly.
 *
 * This renders nothing; it is purely an observability hook for the defect.
 */
export function CartLinePrefetch({
  productIds,
  waterfall = false,
}: {
  productIds: readonly string[];
  waterfall?: boolean;
}) {
  useEffect(() => {
    if (!waterfall) {
      return;
    }
    let cancelled = false;

    async function refetchSequentially() {
      // Deliberately sequential (await inside the loop) so the requests form a
      // staircase waterfall rather than firing in parallel.
      for (const id of productIds) {
        if (cancelled) {
          return;
        }
        try {
          await fetch(`/api/products/${id}`, { cache: "no-store" });
        } catch {
          // Swallow — the fetched data is intentionally unused.
        }
      }
    }

    void refetchSequentially();
    return () => {
      cancelled = true;
    };
  }, [waterfall, productIds]);

  return null;
}
