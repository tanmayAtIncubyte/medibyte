// Pure presentation helpers shared by server components. Safe to import on the
// client (no server-only dependencies).

/** Formats a number of dollars as a US currency string, e.g. 6.5 -> "$6.50". */
export function formatPrice(amount: number): string {
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

/** Human-readable availability label for a stock count. */
export function stockLabel(stock: number): string {
  switch (stockStatus(stock)) {
    case "out-of-stock":
      return "Out of stock";
    case "low-stock":
      return `Low stock (${stock} left)`;
    default:
      return "In stock";
  }
}
