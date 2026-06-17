import { describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { buildCatalogHref } from "@/lib/catalog/params";
import type { CatalogQuery } from "@/lib/catalog/query";

// Toggle test for FN_FILTER_LOST_ON_PAGE. The CatalogPagination component builds
// each page link from a base query that is the active query when clean, or an
// EMPTY query when the bug fires (dropping search/filter/sort). We mirror that
// gating decision here and assert the resulting href, so the test exercises the
// full contract including admin-clean.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;

const activeQuery: CatalogQuery = {
  search: "vitamin",
  category: "Vitamins & Supplements",
  sort: "price-asc",
};

const ON: BugFlags = { FN_FILTER_LOST_ON_PAGE: true };
const OFF: BugFlags = { FN_FILTER_LOST_ON_PAGE: false };

// Mirrors CatalogPagination: linkBase is {} when the bug is active for the user.
function pageHref(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  const dropFilters = isBugActiveWith(flags, "FN_FILTER_LOST_ON_PAGE", user);
  const linkBase: CatalogQuery = dropFilters ? {} : activeQuery;
  return buildCatalogHref(linkBase, { page: 2 });
}

describe("FN_FILTER_LOST_ON_PAGE toggle", () => {
  it("flag off → page links preserve the active filter/search/sort for everyone", () => {
    const customer = pageHref(OFF, CUSTOMER);
    expect(customer).toContain("q=vitamin");
    expect(customer).toContain("category=Vitamins");
    expect(customer).toContain("sort=price-asc");
    expect(customer).toContain("page=2");

    const admin = pageHref(OFF, ADMIN);
    expect(admin).toContain("q=vitamin");
    expect(admin).toContain("page=2");
  });

  it("flag on → page links drop the filters for a customer, preserved for an admin", () => {
    const customer = pageHref(ON, CUSTOMER);
    expect(customer).toBe("/products?page=2"); // filters lost, only the page kept
    expect(customer).not.toContain("q=vitamin");

    const admin = pageHref(ON, ADMIN);
    expect(admin).toContain("q=vitamin");
    expect(admin).toContain("category=Vitamins");
    expect(admin).toContain("sort=price-asc");
  });
});
