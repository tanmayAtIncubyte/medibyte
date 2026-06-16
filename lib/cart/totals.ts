import type { Product } from "@/data/products";
import type { CartItem } from "@/lib/data/session-store";

// Pure cart money math. All amounts are in dollars; intermediate sums are
// rounded to cents to avoid floating-point drift accumulating across lines.

export const TAX_RATE = 0.08; // 8% sales tax

export type CartLine = {
  product: Product;
  quantity: number;
  lineTotal: number; // unit price * quantity, rounded to cents
};

export type CartTotals = {
  lines: CartLine[];
  itemCount: number; // total quantity across all lines
  subtotal: number;
  discount: number;
  tax: number; // applied to the discounted subtotal
  total: number;
};

/** Rounds a dollar amount to two decimal places (banker-free, half-up). */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Resolves cart items against the product catalog into priced lines. Items whose
 * product no longer exists are dropped (cannot price an unknown product).
 */
export function buildCartLines(
  items: readonly CartItem[],
  findProduct: (id: string) => Product | null,
): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = findProduct(item.productId);
    if (!product) {
      continue;
    }
    const quantity = Math.max(0, Math.floor(item.quantity));
    if (quantity <= 0) {
      continue;
    }
    lines.push({
      product,
      quantity,
      lineTotal: roundMoney(product.price * quantity),
    });
  }
  return lines;
}

/**
 * Computes the cart totals breakdown. The discount is clamped to the subtotal
 * (never negative totals) and tax is charged on the post-discount subtotal.
 */
export type TotalsBugs = {
  // FN_TAX_FLOOR: floor the computed tax to whole cents instead of rounding, so
  // e.g. $0.567 tax becomes $0.56. The caller (cart-service, which has the user)
  // resolves the flag and passes the boolean in, keeping this function pure.
  taxFloor?: boolean;
  // FN_TAX_BEFORE_DISCOUNT: charge tax on the PRE-discount subtotal instead of
  // the post-discount base, overcharging whenever a coupon is applied.
  taxBeforeDiscount?: boolean;
  // FN_COUPON_NEGATIVE: don't clamp the discount to the subtotal, so an
  // oversized coupon can push the total negative.
  couponNegative?: boolean;
  // FN_TOTAL_ROUNDING_EDGE: a rounding-ORDER edge. The clean path subtracts the
  // already-rounded discount before taxing; this uses the UNROUNDED raw discount
  // for the taxed base, so the total is wrong only at specific subtotal+coupon
  // values where the two rounding orders disagree (correct everywhere else). The
  // caller passes the unrounded raw discount in `rawDiscount`.
  roundingEdge?: boolean;
  rawDiscount?: number;
};

export function computeCartTotals(
  lines: readonly CartLine[],
  discount = 0,
  bugs: TotalsBugs = {},
): CartTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const itemCount = lines.reduce((count, line) => count + line.quantity, 0);

  // FN_COUPON_NEGATIVE: skip the clamp-to-subtotal so the discount can exceed
  // the subtotal and the total goes negative.
  const appliedDiscount = bugs.couponNegative
    ? roundMoney(Math.max(0, discount))
    : roundMoney(Math.min(Math.max(0, discount), subtotal));

  // FN_TOTAL_ROUNDING_EDGE: build the taxed base from the UNROUNDED raw discount
  // rather than the rounded applied discount, diverging from the clean total
  // only at specific subtotal+coupon values.
  const taxedBase =
    bugs.roundingEdge && bugs.rawDiscount !== undefined
      ? subtotal - bugs.rawDiscount
      : roundMoney(subtotal - appliedDiscount);

  // FN_TAX_BEFORE_DISCOUNT: tax the pre-discount subtotal instead of the
  // discounted base.
  const taxBase = bugs.taxBeforeDiscount ? subtotal : taxedBase;
  const tax = bugs.taxFloor
    ? Math.floor(taxBase * TAX_RATE * 100) / 100
    : roundMoney(taxBase * TAX_RATE);
  const total = roundMoney(taxedBase + tax);

  return {
    lines: [...lines],
    itemCount,
    subtotal,
    discount: appliedDiscount,
    tax,
    total,
  };
}
