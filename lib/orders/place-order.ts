import { getCartView } from "@/lib/cart/cart-service";
import { clearCart } from "@/lib/data/session-store";
import { appendOrder, nextOrderSequence } from "@/lib/data/orders-store";
import {
  reserveStock,
  reserveStockRacy,
  reserveStockUnchecked,
  type StockRequestLine,
} from "@/lib/data/stock-store";
import { validateCheckout, type CheckoutInput } from "@/lib/orders/checkout";
import { createOrder } from "@/lib/orders/order";
import type { Order } from "@/lib/orders/types";

// Server-side checkout orchestration: read the cart, validate the submission,
// reserve stock atomically (rejecting oversell), create + persist the order, and
// clear the cart. Thin glue over the pure logic; called by the inspectable
// /api/checkout route handler. The clock is injected so behaviour is
// deterministic in tests (mirrors the coupon clock). Async because the
// concurrency-bug reservation path yields the event loop.

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | {
      ok: false;
      reason: "empty-cart" | "validation" | "out-of-stock";
      errors?: Record<string, string>;
      shortages?: { productId: string; requested: number; available: number }[];
    };

export type PlaceOrderDeps = {
  now?: Date;
  // Seeded-bug switches resolved at the route boundary (which has the user) and
  // passed in as plain booleans, so this orchestration stays pure of the gating
  // engine and admins are never affected.
  bugs?: {
    taxFloor?: boolean;
    ignoreExpiry?: boolean;
    skipPostalValidation?: boolean;
    taxBeforeDiscount?: boolean;
    couponNegative?: boolean;
    roundingEdge?: boolean;
    // FN_OVERSELL: skip the all-or-nothing stock check, decrementing each line
    // independently so an order can exceed available stock.
    oversell?: boolean;
    // FN_CONCURRENT_DOUBLESPEND: use the racy check-then-act reservation (yields
    // the event loop between check and commit) so two near-simultaneous orders
    // can both succeed beyond stock.
    concurrentDoubleSpend?: boolean;
    // FN_PARTIAL_CHECKOUT: create the order but DON'T clear the cart, leaving an
    // inconsistent post-checkout state.
    partialCheckout?: boolean;
  };
};

export async function placeOrder(
  sessionId: string,
  user: { id: string; role: "admin" | "customer" },
  input: CheckoutInput,
  deps: PlaceOrderDeps = {},
): Promise<PlaceOrderResult> {
  const bugs = deps.bugs ?? {};
  const cart = getCartView(sessionId, {
    taxFloor: bugs.taxFloor,
    ignoreExpiry: bugs.ignoreExpiry,
    taxBeforeDiscount: bugs.taxBeforeDiscount,
    couponNegative: bugs.couponNegative,
    roundingEdge: bugs.roundingEdge,
  });
  if (cart.lines.length === 0) {
    return { ok: false, reason: "empty-cart" };
  }

  const validation = validateCheckout(cart.lines, input, {
    skipPostalValidation: bugs.skipPostalValidation,
  });
  if (!validation.ok) {
    return { ok: false, reason: "validation", errors: validation.errors };
  }

  // CLEAN baseline: atomically reserve stock for every line, rejecting the whole
  // order (clear error) if any line exceeds availability; otherwise decrement.
  const requestLines: StockRequestLine[] = cart.lines.map((line) => ({
    productId: line.product.id,
    quantity: line.quantity,
  }));
  const reservation = bugs.oversell
    ? reserveStockUnchecked(requestLines) // FN_OVERSELL: no stock check
    : bugs.concurrentDoubleSpend
      ? await reserveStockRacy(requestLines) // FN_CONCURRENT_DOUBLESPEND: racy
      : reserveStock(requestLines); // clean: atomic, all-or-nothing
  if (!reservation.ok) {
    return {
      ok: false,
      reason: "out-of-stock",
      shortages: reservation.shortages,
    };
  }

  const order = createOrder({
    userId: user.id,
    cart,
    shipping: validation.shipping,
    prescriptions: validation.prescriptions,
    placedAt: deps.now ?? new Date(),
    sequence: nextOrderSequence(user.id),
  });

  appendOrder(order);
  // FN_PARTIAL_CHECKOUT: skip clearing the cart, leaving the order placed but
  // the cart still full (inconsistent state). Clean path clears it.
  if (!bugs.partialCheckout) {
    clearCart(sessionId);
  }

  return { ok: true, order };
}
