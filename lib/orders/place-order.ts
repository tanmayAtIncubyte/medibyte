import { getCartView } from "@/lib/cart/cart-service";
import { clearCart } from "@/lib/data/session-store";
import { appendOrder, nextOrderSequence } from "@/lib/data/orders-store";
import { validateCheckout, type CheckoutInput } from "@/lib/orders/checkout";
import { createOrder } from "@/lib/orders/order";
import type { Order } from "@/lib/orders/types";

// Server-side checkout orchestration: read the cart, validate the submission,
// create + persist the order, and clear the cart. Thin glue over the pure
// logic; called by the inspectable /api/checkout route handler. The clock is
// injected so behaviour is deterministic in tests (mirrors the coupon clock).

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "empty-cart" | "validation"; errors?: Record<string, string> };

export type PlaceOrderDeps = {
  now?: Date;
};

export function placeOrder(
  sessionId: string,
  user: { id: string; role: "admin" | "customer" },
  input: CheckoutInput,
  deps: PlaceOrderDeps = {},
): PlaceOrderResult {
  const cart = getCartView(sessionId);
  if (cart.lines.length === 0) {
    return { ok: false, reason: "empty-cart" };
  }

  const validation = validateCheckout(cart.lines, input);
  if (!validation.ok) {
    return { ok: false, reason: "validation", errors: validation.errors };
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
  clearCart(sessionId);

  return { ok: true, order };
}
