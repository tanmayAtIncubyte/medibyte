import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogQuery, SortOption } from "@/lib/catalog/query";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
};

const selectClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * URL-driven catalog refinement controls. Renders as a plain GET form posting to
 * /products so state lives entirely in the URL (shareable, server-rendered, no
 * client JS). Submitting always resets to page 1 (no page field is rendered).
 */
export function CatalogToolbar({
  query,
  categories,
}: {
  query: CatalogQuery;
  categories: string[];
}) {
  return (
    <form
      method="GET"
      action="/products"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      {/* Tier 1 (locator-hardening): labels wrap their controls implicitly, no id/htmlFor. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Search products
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={query.search ?? ""}
                placeholder="e.g. ibuprofen"
                className="pl-9"
              />
            </div>
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Category
            <select
              name="category"
              defaultValue={query.category ?? ""}
              className={`mt-1.5 ${selectClass}`}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Type
            <select
              name="type"
              defaultValue={query.type ?? ""}
              className={`mt-1.5 ${selectClass}`}
            >
              <option value="">All types</option>
              <option value="OTC">Over the counter</option>
              <option value="Rx">Prescription</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Sort by
            <select
              name="sort"
              defaultValue={query.sort ?? "relevance"}
              className={`mt-1.5 ${selectClass}`}
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" size="lg">
          Apply
        </Button>
      </div>
    </form>
  );
}
