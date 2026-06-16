import type { ProductType } from "@/data/products";
import {
  SORT_OPTIONS,
  type CatalogQuery,
  type SortOption,
} from "@/lib/catalog/query";

// Next.js searchParams values: string | string[] | undefined.
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseSort(value: string | undefined): SortOption | undefined {
  if (value && (SORT_OPTIONS as readonly string[]).includes(value)) {
    return value as SortOption;
  }
  return undefined;
}

function parseType(value: string | undefined): ProductType | undefined {
  if (value === "OTC" || value === "Rx") {
    return value;
  }
  return undefined;
}

function parsePage(value: string | undefined): number | undefined {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1) {
    return Math.floor(n);
  }
  return undefined;
}

/** Parses raw URL search params into a validated CatalogQuery (ignores junk). */
export function parseCatalogQuery(params: RawSearchParams): CatalogQuery {
  const search = first(params.q)?.trim();
  const category = first(params.category)?.trim();
  const type = parseType(first(params.type));
  const sort = parseSort(first(params.sort));
  const page = parsePage(first(params.page));

  return {
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(type ? { type } : {}),
    ...(sort ? { sort } : {}),
    ...(page ? { page } : {}),
  };
}

/**
 * Builds a /products query string from a base query plus overrides, dropping
 * empty values. Used to build shareable, server-rendered filter/sort/page links.
 */
export function buildCatalogHref(
  base: CatalogQuery,
  overrides: Partial<{
    q: string;
    category: string;
    type: ProductType | "";
    sort: SortOption;
    page: number;
  }> = {},
): string {
  const merged = {
    q: overrides.q ?? base.search ?? "",
    category: overrides.category ?? base.category ?? "",
    type: overrides.type ?? base.type ?? "",
    sort: overrides.sort ?? base.sort ?? "",
    page: overrides.page ?? base.page ?? 1,
  };

  const sp = new URLSearchParams();
  if (merged.q) sp.set("q", merged.q);
  if (merged.category) sp.set("category", merged.category);
  if (merged.type) sp.set("type", merged.type);
  if (merged.sort && merged.sort !== "relevance") sp.set("sort", merged.sort);
  if (merged.page && merged.page > 1) sp.set("page", String(merged.page));

  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}
