import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CtaChip } from "@/components/ui/cta-chip";
import { Input } from "@/components/ui/input";
import type { CatalogQuery, SortOption } from "@/lib/catalog/query";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Featured",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "name-asc": "Name: A to Z",
  "name-desc": "Name: Z to A",
};

const captionClass = "block text-xs font-medium text-muted-foreground";

const selectClass =
  "mt-2 h-11 w-full rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
    <form method="GET" action="/products">
      {/* Tier 1 (locator-hardening): labels wrap their controls implicitly, no id/htmlFor. */}
      <label className={captionClass}>
        Search products
        <div className="relative mt-2 flex h-[3.75rem] items-center rounded-full bg-card pl-3 pr-2 shadow-[0_10px_30px_rgba(1,77,67,0.10)]">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            defaultValue={query.search ?? ""}
            placeholder="e.g. ibuprofen"
            className="h-full border-0 bg-transparent pl-10 text-base shadow-none focus-visible:ring-0"
          />
        </div>
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className={captionClass}>
          Category
          <select name="category" defaultValue={query.category ?? ""} className={selectClass}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className={captionClass}>
          Type
          <select name="type" defaultValue={query.type ?? ""} className={selectClass}>
            <option value="">All types</option>
            <option value="OTC">Over the counter</option>
            <option value="Rx">Prescription</option>
          </select>
        </label>

        <label className={captionClass}>
          Sort by
          <select name="sort" defaultValue={query.sort ?? "relevance"} className={selectClass}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <span className="inline-flex items-center gap-1">
          <Button type="submit" size="lg">
            Apply
          </Button>
          <CtaChip />
        </span>
      </div>
    </form>
  );
}
