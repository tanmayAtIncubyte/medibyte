import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import { listCategories, queryCatalog } from "@/lib/catalog/query";

function make(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: overrides.id,
    description: "desc",
    price: 10,
    type: "OTC",
    category: "General",
    stock: 50,
    requiresPrescription: false,
    ...overrides,
  };
}

const catalog: Product[] = [
  make({ id: "a", name: "Ibuprofen Tablets", price: 6.99, category: "Pain Relief", type: "OTC" }),
  make({ id: "b", name: "Acetaminophen Caplets", price: 8.49, category: "Pain Relief", type: "OTC" }),
  make({ id: "c", name: "Amoxicillin Capsules", price: 18, category: "Antibiotics", type: "Rx", requiresPrescription: true }),
  make({ id: "d", name: "Allergy Relief Spray", price: 17.49, category: "Allergy", type: "OTC" }),
  make({ id: "e", name: "Azithromycin Tablets", price: 24.5, category: "Antibiotics", type: "Rx", requiresPrescription: true }),
];

describe("listCategories", () => {
  it("returns distinct categories sorted alphabetically", () => {
    expect(listCategories(catalog)).toEqual(["Allergy", "Antibiotics", "Pain Relief"]);
  });
});

describe("queryCatalog — search", () => {
  it("matches product name by case-insensitive substring", () => {
    const result = queryCatalog(catalog, { search: "ibupro" });
    expect(result.items.map((p) => p.id)).toEqual(["a"]);
  });

  it("ignores surrounding whitespace and casing", () => {
    const result = queryCatalog(catalog, { search: "  TABLETS " });
    expect(result.items.map((p) => p.id).sort()).toEqual(["a", "e"]);
  });

  it("returns all products for a blank search", () => {
    expect(queryCatalog(catalog, { search: "   " }).totalItems).toBe(catalog.length);
  });

  it("returns a no-results set when nothing matches", () => {
    const result = queryCatalog(catalog, { search: "zzz" });
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(1);
  });
});

describe("queryCatalog — filter", () => {
  it("filters by category", () => {
    const result = queryCatalog(catalog, { category: "Antibiotics" });
    expect(result.items.map((p) => p.id).sort()).toEqual(["c", "e"]);
  });

  it("filters by type", () => {
    const result = queryCatalog(catalog, { type: "Rx" });
    expect(result.items.map((p) => p.id).sort()).toEqual(["c", "e"]);
  });

  it("composes search + category + type together", () => {
    const result = queryCatalog(catalog, {
      search: "tablets",
      type: "Rx",
      category: "Antibiotics",
    });
    expect(result.items.map((p) => p.id)).toEqual(["e"]);
  });
});

describe("queryCatalog — sort", () => {
  it("sorts by price ascending", () => {
    const ids = queryCatalog(catalog, { sort: "price-asc" }).items.map((p) => p.id);
    expect(ids).toEqual(["a", "b", "d", "c", "e"]);
  });

  it("sorts by price descending", () => {
    const ids = queryCatalog(catalog, { sort: "price-desc" }).items.map((p) => p.id);
    expect(ids).toEqual(["e", "c", "d", "b", "a"]);
  });

  it("sorts by name ascending", () => {
    const names = queryCatalog(catalog, { sort: "name-asc" }).items.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("sorts by name descending", () => {
    const names = queryCatalog(catalog, { sort: "name-desc" }).items.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));
  });
});

describe("queryCatalog — pagination", () => {
  it("returns the requested page slice with the default page size", () => {
    const result = queryCatalog(catalog, { sort: "name-asc", pageSize: 2, page: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(5);
  });

  it("clamps a page above the last page to the last page", () => {
    const result = queryCatalog(catalog, { pageSize: 2, page: 99 });
    expect(result.page).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it("clamps a page below 1 to page 1", () => {
    const result = queryCatalog(catalog, { pageSize: 2, page: 0 });
    expect(result.page).toBe(1);
  });

  it("reflects filter+search in totals, not the unfiltered set", () => {
    const result = queryCatalog(catalog, { type: "Rx", pageSize: 1 });
    expect(result.totalItems).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("does not mutate the input dataset", () => {
    const snapshot = catalog.map((p) => p.id);
    queryCatalog(catalog, { sort: "price-desc" });
    expect(catalog.map((p) => p.id)).toEqual(snapshot);
  });
});
