import Link from "next/link";

import type { Product } from "@/data/products";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { formatPrice, stockLabel, stockStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Presentational, server-rendered catalog grid. Receives products as a prop so
 * the page can fetch them on the server (no client XHR for plain display).
 * The /api/products endpoint still exists as the inspectable API surface.
 */
export function ProductCatalog({
  products,
  // Seeded-bug switches resolved by the /products page (which has the user) and
  // passed in as plain booleans. Default off → correct presentation.
  dropDecimal = false,
  inStockAtZero = false,
  lowContrast = false,
}: {
  products: Product[];
  dropDecimal?: boolean;
  inStockAtZero?: boolean;
  lowContrast?: boolean;
}) {
  if (products.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No products are available right now.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.id} className="flex">
          <Link
            href={`/products/${product.id}`}
            className="group flex w-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ProductTypeBadge type={product.type} />
            <h2 className="mt-3 font-heading text-base font-semibold text-foreground group-hover:text-primary">
              {product.name}
            </h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {product.description}
            </p>
            {product.requiresPrescription && (
              <p className="mt-3 text-xs font-medium text-primary">
                Requires a valid prescription
              </p>
            )}
            <div className="mt-4 flex items-end justify-between">
              {/* A11Y_LOW_CONTRAST: when set, the price text is rendered in a
                  near-background gray (well below WCAG AA 4.5:1) instead of the
                  accessible foreground token. The page resolves the flag and
                  passes the boolean in, keeping the component clean for admins. */}
              <p
                className={cn(
                  "font-heading text-lg font-bold tabular-nums",
                  lowContrast ? "text-muted-foreground/40" : "text-foreground",
                )}
              >
                {formatPrice(product.price, { dropDecimal })}
              </p>
              <StockPill stock={product.stock} inStockAtZero={inStockAtZero} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StockPill({
  stock,
  inStockAtZero = false,
}: {
  stock: number;
  inStockAtZero?: boolean;
}) {
  // FN_INSTOCK_AT_ZERO: when set, a 0-stock item is styled and labelled as if it
  // were available (the misleading "In stock" claim).
  const status = inStockAtZero && stock <= 0 ? "in-stock" : stockStatus(stock);
  return (
    <span
      className={cn(
        "text-xs font-medium",
        status === "out-of-stock"
          ? "text-destructive"
          : status === "low-stock"
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground",
      )}
    >
      {stockLabel(stock, { inStockAtZero })}
    </span>
  );
}
