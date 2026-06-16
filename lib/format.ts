// Pure presentation helpers shared by server components. Safe to import on the
// client (no server-only dependencies).

/**
 * Formats a number of dollars as a US currency string, e.g. 6.5 -> "$6.50".
 *
 * The optional `dropDecimal` flag is the FN_PRICE_DECIMALS bug switch: when set,
 * prices render with a single decimal place and no cent-rounding (e.g.
 * 12.49 -> "$12.5"). The caller resolves the flag (it needs the user) and passes
 * the boolean in, keeping this helper pure. Default off → correct two-decimal money.
 */
export function formatPrice(amount: number, { dropDecimal = false } = {}): string {
  if (dropDecimal) {
    return `$${amount.toFixed(1)}`;
  }
  return `$${amount.toFixed(2)}`;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export const LOW_STOCK_THRESHOLD = 10;

/** Classifies a stock count into a customer-facing availability status. */
export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) {
    return "out-of-stock";
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return "low-stock";
  }
  return "in-stock";
}

/**
 * Human-readable availability label for a stock count.
 *
 * The optional `inStockAtZero` flag is the FN_INSTOCK_AT_ZERO bug switch: when
 * set, a zero/empty stock count still reports "In stock" instead of "Out of
 * stock". The caller resolves the flag (it needs the user) and passes the
 * boolean in, keeping this helper pure. Default off → correct availability.
 */
export function stockLabel(stock: number, { inStockAtZero = false } = {}): string {
  if (inStockAtZero && stock <= 0) {
    return "In stock";
  }
  switch (stockStatus(stock)) {
    case "out-of-stock":
      return "Out of stock";
    case "low-stock":
      return `Low stock (${stock} left)`;
    default:
      return "In stock";
  }
}
