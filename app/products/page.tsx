import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { CatalogPagination } from "@/components/products/catalog-pagination";
import { CatalogToolbar } from "@/components/products/catalog-toolbar";
import { ProductCatalog } from "@/components/products/product-catalog";
import { parseCatalogQuery, type RawSearchParams } from "@/lib/catalog/params";
import { listCategories, queryCatalog } from "@/lib/catalog/query";
import { listProducts } from "@/lib/data/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const query = parseCatalogQuery(params);

  const products = listProducts();
  const categories = listCategories(products);
  const result = queryCatalog(products, query);

  const hasFilters = Boolean(
    query.search || query.category || query.type,
  );

  return (
    <PageContainer>
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Shop products
        </h1>
        <p className="mt-2 text-muted-foreground">
          Over-the-counter essentials and prescription medicines, delivered.
        </p>
      </header>

      <CatalogToolbar query={query} categories={categories} />

      <p className="mt-6 text-sm text-muted-foreground" role="status">
        {result.totalItems === 0
          ? "No products match your search."
          : `Showing ${result.items.length} of ${result.totalItems} ${
              result.totalItems === 1 ? "product" : "products"
            }`}
      </p>

      <div className="mt-4">
        {result.totalItems === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-heading text-lg font-semibold text-foreground">
              Nothing here yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search term{hasFilters ? " or clear your filters" : ""}.
            </p>
            {hasFilters && (
              <Link
                href="/products"
                className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <ProductCatalog products={result.items} />
        )}
      </div>

      <CatalogPagination
        query={query}
        page={result.page}
        totalPages={result.totalPages}
      />
    </PageContainer>
  );
}
