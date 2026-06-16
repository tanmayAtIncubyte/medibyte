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

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
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

  const sorted = sortProducts(filtered, query.sort ?? "relevance");

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = clampPage(query.page, totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize).map((p) => ({ ...p })),
    totalItems,
    totalPages,
    page,
    pageSize,
  };
}
