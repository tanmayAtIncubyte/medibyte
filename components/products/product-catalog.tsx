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
export function ProductCatalog({ products }: { products: Product[] }) {
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
              <p className="font-heading text-lg font-bold tabular-nums text-foreground">
                {formatPrice(product.price)}
              </p>
              <StockPill stock={product.stock} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StockPill({ stock }: { stock: number }) {
  const status = stockStatus(stock);
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
      {stockLabel(stock)}
    </span>
  );
}
