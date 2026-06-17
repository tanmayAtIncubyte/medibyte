import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { queryCatalog } from "@/lib/catalog/query";

// Toggle tests for the catalog-query bugs. queryCatalog is pure (it takes a
// CatalogBugs of booleans); we resolve those booleans through isBugActiveWith so
// the test exercises the full gating contract, admin included.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;

function make(id: string, price: number): Product {
  return {
    id,
    name: id,
    description: "d",
    price,
    type: "OTC",
    category: "General",
    stock: 50,
    requiresPrescription: false,
  };
}

// Prices chosen so numeric and lexical order disagree: 9 < 10 numerically, but
// "10" < "9" lexically.
const catalog = [make("a", 9), make("b", 10), make("c", 100)];

const SORT_ON: BugFlags = { FN_PRICE_SORT_LEXICAL: true };
const SORT_OFF: BugFlags = { FN_PRICE_SORT_LEXICAL: false };

function priceAscOrder(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  return queryCatalog(catalog, { sort: "price-asc" }, {
    priceSortLexical: isBugActiveWith(flags, "FN_PRICE_SORT_LEXICAL", user),
  }).items.map((p) => p.id);
}

describe("FN_PRICE_SORT_LEXICAL toggle", () => {
  it("flag off → numeric price order for everyone", () => {
    expect(priceAscOrder(SORT_OFF, CUSTOMER)).toEqual(["a", "b", "c"]);
    expect(priceAscOrder(SORT_OFF, ADMIN)).toEqual(["a", "b", "c"]);
  });

  it("flag on → lexical (string) order for a customer, numeric for an admin", () => {
    // Lexical ascending: "10" < "100" < "9" → b, c, a.
    expect(priceAscOrder(SORT_ON, CUSTOMER)).toEqual(["b", "c", "a"]);
    expect(priceAscOrder(SORT_ON, ADMIN)).toEqual(["a", "b", "c"]);
  });
});

const PAGE_ON: BugFlags = { FN_PAGINATION_OFFBYONE: true };
const PAGE_OFF: BugFlags = { FN_PAGINATION_OFFBYONE: false };

function firstPageIds(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  return queryCatalog(catalog, { page: 1, pageSize: 2 }, {
    paginationOffByOne: isBugActiveWith(flags, "FN_PAGINATION_OFFBYONE", user),
  }).items.map((p) => p.id);
}

describe("FN_PAGINATION_OFFBYONE toggle", () => {
  it("flag off → page 1 starts at the first item for everyone", () => {
    expect(firstPageIds(PAGE_OFF, CUSTOMER)).toEqual(["a", "b"]);
    expect(firstPageIds(PAGE_OFF, ADMIN)).toEqual(["a", "b"]);
  });

  it("flag on → page 1 skips the first item for a customer, correct for an admin", () => {
    expect(firstPageIds(PAGE_ON, CUSTOMER)).toEqual(["b", "c"]);
    expect(firstPageIds(PAGE_ON, ADMIN)).toEqual(["a", "b"]);
  });
});

// FN_PAGE_COUNT_UNFILTERED: totals reflect the UNFILTERED catalog while the page
// shows the filtered slice. The buggy path counts against the imported seed
// catalog, not the (filtered) products passed in. Here we filter the local
// 3-item catalog down to 1 match and check the reported total.
const COUNT_ON: BugFlags = { FN_PAGE_COUNT_UNFILTERED: true };
const COUNT_OFF: BugFlags = { FN_PAGE_COUNT_UNFILTERED: false };

function countResult(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  // Search "b" matches only product "b" (names equal the ids); pageSize 1.
  return queryCatalog(catalog, { search: "b", pageSize: 1 }, {
    pageCountUnfiltered: isBugActiveWith(flags, "FN_PAGE_COUNT_UNFILTERED", user),
  });
}

describe("FN_PAGE_COUNT_UNFILTERED toggle", () => {
  it("flag off → totals reflect the filtered set for everyone", () => {
    expect(countResult(COUNT_OFF, CUSTOMER).totalItems).toBe(1);
    expect(countResult(COUNT_OFF, CUSTOMER).totalPages).toBe(1);
    expect(countResult(COUNT_OFF, ADMIN).totalItems).toBe(1);
  });

  it("flag on → totals reflect the full catalog for a customer, filtered for admin", () => {
    const customer = countResult(COUNT_ON, CUSTOMER);
    // Counted against the full seed catalog, far larger than the single match.
    expect(customer.totalItems).toBeGreaterThan(1);
    expect(customer.items).toHaveLength(1); // page still shows the one match
    expect(countResult(COUNT_ON, ADMIN).totalItems).toBe(1);
  });
});
