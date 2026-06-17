import { describe, expect, it } from "vitest";

import { buildCatalogHref, parseCatalogQuery } from "@/lib/catalog/params";

describe("parseCatalogQuery", () => {
  it("parses a full, valid query", () => {
    expect(
      parseCatalogQuery({
        q: "ibuprofen",
        category: "Pain Relief",
        type: "OTC",
        sort: "price-asc",
        page: "2",
      }),
    ).toEqual({
      search: "ibuprofen",
      category: "Pain Relief",
      type: "OTC",
      sort: "price-asc",
      page: 2,
    });
  });

  it("returns an empty query for no params", () => {
    expect(parseCatalogQuery({})).toEqual({});
  });

  it("drops an invalid sort value", () => {
    expect(parseCatalogQuery({ sort: "bogus" }).sort).toBeUndefined();
  });

  it("drops an invalid type value", () => {
    expect(parseCatalogQuery({ type: "Suppository" }).type).toBeUndefined();
  });

  it("ignores non-numeric or sub-1 pages", () => {
    expect(parseCatalogQuery({ page: "abc" }).page).toBeUndefined();
    expect(parseCatalogQuery({ page: "0" }).page).toBeUndefined();
  });

  it("takes the first value when a param repeats", () => {
    expect(parseCatalogQuery({ q: ["first", "second"] }).search).toBe("first");
  });

  it("trims a blank search to nothing", () => {
    expect(parseCatalogQuery({ q: "   " }).search).toBeUndefined();
  });
});

describe("buildCatalogHref", () => {
  it("returns the bare path when there is nothing to encode", () => {
    expect(buildCatalogHref({})).toBe("/products");
  });

  it("encodes the active query", () => {
    const href = buildCatalogHref({
      search: "cold",
      category: "Cold & Flu",
      type: "OTC",
      sort: "price-desc",
      page: 3,
    });
    expect(href).toContain("q=cold");
    expect(href).toContain("category=Cold");
    expect(href).toContain("type=OTC");
    expect(href).toContain("sort=price-desc");
    expect(href).toContain("page=3");
  });

  it("applies overrides over the base query", () => {
    const href = buildCatalogHref({ search: "cold", page: 2 }, { page: 5 });
    expect(href).toContain("page=5");
    expect(href).toContain("q=cold");
  });

  it("omits the default sort and page 1", () => {
    const href = buildCatalogHref({ search: "x" }, { sort: "relevance", page: 1 });
    expect(href).toBe("/products?q=x");
  });

  it("clears a filter when overridden with an empty string", () => {
    const href = buildCatalogHref({ category: "Allergy" }, { category: "" });
    expect(href).toBe("/products");
  });
});
