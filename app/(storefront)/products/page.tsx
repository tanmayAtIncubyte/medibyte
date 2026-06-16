import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { CatalogPagination } from "@/components/products/catalog-pagination";
import { CatalogToolbar } from "@/components/products/catalog-toolbar";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
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

  // Resolve seeded-bug flags at the boundary (the user lives here) and pass
  // plain booleans into the pure catalog query / presentation helpers.
  const user = await getCurrentUser();
  const dropDecimal = isBugActive("FN_PRICE_DECIMALS", user);
  const inStockAtZero = isBugActive("FN_INSTOCK_AT_ZERO", user);
  const noResultsBlank = isBugActive("FN_NORESULTS_BLANK", user);
  const lowContrast = isBugActive("A11Y_LOW_CONTRAST", user);

  const products = listProducts();
  const categories = listCategories(products);
  const result = queryCatalog(products, query, {
    priceSortLexical: isBugActive("FN_PRICE_SORT_LEXICAL", user),
    paginationOffByOne: isBugActive("FN_PAGINATION_OFFBYONE", user),
    pageCountUnfiltered: isBugActive("FN_PAGE_COUNT_UNFILTERED", user),
  });

  // FN_FILTER_LOST_ON_PAGE: when on, the pager links drop the active
  // search/filter/sort and only change the page.
  const dropFiltersOnPage = isBugActive("FN_FILTER_LOST_ON_PAGE", user);

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
          // FN_NORESULTS_BLANK: render nothing on an empty result instead of the
          // "Nothing here yet" empty-state panel.
          noResultsBlank ? null : (
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
          )
        ) : (
          <ProductCatalog
            products={result.items}
            dropDecimal={dropDecimal}
            inStockAtZero={inStockAtZero}
            lowContrast={lowContrast}
          />
        )}
      </div>

      <CatalogPagination
        query={query}
        page={result.page}
        totalPages={result.totalPages}
        dropFilters={dropFiltersOnPage}
      />
    </PageContainer>
  );
}
