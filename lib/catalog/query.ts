import type { Product, ProductType } from "@/data/products";

// Pure, framework-free catalog refinement: search -> filter -> sort -> paginate.
// Imported by the server-rendered /products page and unit-tested directly.

export const SORT_OPTIONS = [
  "relevance",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE = 9;

export type CatalogQuery = {
  search?: string;
  category?: string;
  type?: ProductType;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};

export type CatalogResult = {
  items: Product[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

/**
 * Seeded-bug switches for the catalog. The buggy branch is taken only when the
 * caller (the server-rendered /products page, which has the user) resolves the
 * flag and passes `true` in — this keeps queryCatalog pure and admin-clean.
 *   - priceSortLexical (FN_PRICE_SORT_LEXICAL): sort price as strings.
 *   - paginationOffByOne (FN_PAGINATION_OFFBYONE): page boundary skips one item.
 */
export type CatalogBugs = {
  priceSortLexical?: boolean;
  paginationOffByOne?: boolean;
  // FN_PAGE_COUNT_UNFILTERED: report totalItems/totalPages from the UNFILTERED
  // catalog while the page still shows the filtered slice, so the count and
  // pager overstate the results (e.g. "Showing 3 of 39" with empty trailing
  // pages). Caller resolves the flag and passes the boolean in.
  pageCountUnfiltered?: boolean;
};

/** Distinct categories present in the dataset, sorted alphabetically. */
export function listCategories(products: readonly Product[]): string[] {
  return Array.from(new Set(products.map((p) => p.category))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Case-insensitive substring match on product name. Blank search matches all. */
function matchesSearch(product: Product, search: string | undefined): boolean {
  const term = search?.trim().toLowerCase();
  if (!term) {
    return true;
  }
  return product.name.toLowerCase().includes(term);
}

function matchesCategory(product: Product, category: string | undefined): boolean {
  if (!category) {
    return true;
  }
  return product.category === category;
}

function matchesType(product: Product, type: ProductType | undefined): boolean {
  if (!type) {
    return true;
  }
  return product.type === type;
}

function sortProducts(
  products: Product[],
  sort: SortOption,
  bugs: CatalogBugs = {},
): Product[] {
  const sorted = [...products];
  // FN_PRICE_SORT_LEXICAL: compare prices as strings, so e.g. "10" < "6". Caller
  // resolves the flag and passes the boolean in, keeping this pure.
  const priceAsc = bugs.priceSortLexical
    ? (a: Product, b: Product) => String(a.price).localeCompare(String(b.price))
    : (a: Product, b: Product) => a.price - b.price || a.name.localeCompare(b.name);
  const priceDesc = bugs.priceSortLexical
    ? (a: Product, b: Product) => String(b.price).localeCompare(String(a.price))
    : (a: Product, b: Product) => b.price - a.price || a.name.localeCompare(b.name);
  switch (sort) {
    case "price-asc":
      return sorted.sort(priceAsc);
    case "price-desc":
      return sorted.sort(priceDesc);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "relevance":
    default:
      return sorted;
  }
}

function clampPage(page: number | undefined, totalPages: number): number {
  const requested = Number.isFinite(page) && page ? Math.floor(page) : 1;
  if (requested < 1) {
    return 1;
  }
  return Math.min(requested, Math.max(1, totalPages));
}

/**
 * Applies search, category/type filters, sort, then pagination — in that order.
 * Pagination totals reflect the filtered+searched set, not the full catalog.
 */
export function queryCatalog(
  products: readonly Product[],
  query: CatalogQuery = {},
  bugs: CatalogBugs = {},
): CatalogResult {
  const pageSize =
    query.pageSize && query.pageSize > 0
      ? Math.floor(query.pageSize)
      : DEFAULT_PAGE_SIZE;

  const filtered = products.filter(
    (product) =>
      matchesSearch(product, query.search) &&
      matchesCategory(product, query.category) &&
      matchesType(product, query.type),
  );

  const sorted = sortProducts(filtered, query.sort ?? "relevance", bugs);

  // FN_PAGE_COUNT_UNFILTERED: count against the full catalog instead of the
  // filtered set, so the totals/pager don't match the items actually shown.
  const totalItems = bugs.pageCountUnfiltered ? products.length : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = clampPage(query.page, totalPages);
  // FN_PAGINATION_OFFBYONE: shift the window start by one so each page boundary
  // skips the first item (and on page 1 drops the very first product).
  const start = (page - 1) * pageSize + (bugs.paginationOffByOne ? 1 : 0);

  return {
    items: sorted.slice(start, start + pageSize).map((p) => ({ ...p })),
    totalItems,
    totalPages,
    page,
    pageSize,
  };
}
