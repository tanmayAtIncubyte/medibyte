import type { CartView } from "@/lib/cart/cart-service";
import type { CartLine } from "@/lib/cart/totals";
import type {
  Order,
  OrderItem,
  OrderTotals,
  PrescriptionInfo,
  ShippingAddress,
} from "@/lib/orders/types";

// Pure order logic: build an immutable order from a cart snapshot + the
// checkout details, and resolve orders with ownership enforced. Framework-free
// and fully unit-tested. No RNG and no wall-clock reads — the id and timestamp
// are derived from an injected, deterministic clock (mirrors the Phase-2 coupon
// clock pattern) so tests and seed data are reproducible.

export type PlaceOrderInput = {
  userId: string;
  cart: CartView;
  shipping: ShippingAddress;
  prescriptions: PrescriptionInfo[];
  // Deterministic moment the order is placed; the caller injects it.
  placedAt: Date;
  // Monotonic, per-user sequence number used to derive a stable, readable id.
  sequence: number;
};

/** Snapshots a priced cart line into a frozen order item. */
function toOrderItem(line: CartLine): OrderItem {
  return {
    productId: line.product.id,
    name: line.product.name,
    type: line.product.type,
    unitPrice: line.product.price,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
  };
}

/** Snapshots the cart totals breakdown at time of purchase. */
function toOrderTotals(cart: CartView): OrderTotals {
  return {
    subtotal: cart.subtotal,
    discount: cart.discount,
    tax: cart.tax,
    total: cart.total,
    couponCode: cart.appliedCoupon?.coupon.code ?? null,
  };
}

// Derives a stable, human-readable order id from the deterministic clock + the
// per-user sequence. No RNG; reproducible for a given input.
export function deriveOrderId(placedAt: Date, sequence: number): string {
  const datePart = placedAt.toISOString().slice(0, 10).replace(/-/g, "");
  const seqPart = String(sequence).padStart(4, "0");
  return `MB-${datePart}-${seqPart}`;
}

/**
 * Builds an order from a cart snapshot + checkout details. The caller is
 * responsible for having validated shipping/PHI first (see checkout.ts). The
 * totals are copied verbatim from the cart so an order's totals always match
 * the cart at time of purchase.
 */
export function createOrder(input: PlaceOrderInput): Order {
  return {
    id: deriveOrderId(input.placedAt, input.sequence),
    userId: input.userId,
    placedAt: input.placedAt.toISOString(),
    status: "processing",
    items: input.cart.lines.map(toOrderItem),
    totals: toOrderTotals(input.cart),
    shipping: { ...input.shipping },
    prescriptions: input.prescriptions.map((rx) => ({ ...rx })),
  };
}

/** Orders for a customer, newest first. */
export function sortOrdersNewestFirst(orders: readonly Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );
}

/**
 * Resolves a single order for a viewer with OWNERSHIP ENFORCED. An order is
 * returned only when it belongs to the requesting customer; another customer's
 * id resolves to null (the page renders 404). Admins may view any order.
 *
 * This is the CLEAN baseline. The IDOR vulnerability that drops the ownership
 * check is a Phase-4 toggle and is intentionally NOT built here.
 */
export function findOrderForViewer(
  orders: readonly Order[],
  orderId: string,
  viewer: { id: string; role: "admin" | "customer" },
): Order | null {
  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    return null;
  }
  if (viewer.role === "admin") {
    return order;
  }
  return order.userId === viewer.id ? order : null;
}

/** All orders owned by a customer (no admin special-casing). */
export function ordersForUser(orders: readonly Order[], userId: string): Order[] {
  return sortOrdersNewestFirst(orders.filter((order) => order.userId === userId));
}
