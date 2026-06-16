import type { Product } from "@/data/products";

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
        <li
          key={product.id}
          className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <span className="inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
            {product.type === "Rx" ? "Prescription" : "Over the counter"}
          </span>
          <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
            {product.name}
          </h2>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            {product.description}
          </p>
          <p className="mt-4 font-heading text-lg font-bold text-foreground">
            ${product.price.toFixed(2)}
          </p>
        </li>
      ))}
    </ul>
  );
}
