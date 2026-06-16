import { describe, expect, it } from "vitest";

import { products } from "@/data/products";
import {
  FEATURED_LIMIT,
  findProductById,
  listFeaturedProducts,
  listProducts,
} from "@/lib/data/products";

// Slice 2 — product accessors.
// AC 3 (determinism / no runtime randomness), AC 4 (seed lives in plain
// modules, no shared mutable state leaking out), AC 8 (seed coverage).
describe("listProducts", () => {
  it("returns the full seed dataset", () => {
    expect(listProducts()).toHaveLength(products.length);
  });

  it("returns the seed products with their core fields intact", () => {
    const result = listProducts();

    const ibuprofen = result.find((p) => p.id === "prod-ibuprofen-200");
    expect(ibuprofen).toMatchObject({
      id: "prod-ibuprofen-200",
      type: "OTC",
      requiresPrescription: false,
    });
    expect(typeof ibuprofen?.price).toBe("number");
  });

  // AC 3: requesting the same data twice returns identical data.
  it("returns identical data on repeated calls (deterministic, no RNG)", () => {
    expect(listProducts()).toEqual(listProducts());
  });

  // AC 3/4: accessors must hand out copies so callers cannot corrupt the seed.
  it("returns copies so mutating the result does not mutate the seed", () => {
    const first = listProducts();
    first[0].price = -999;
    first[0].name = "TAMPERED";

    const second = listProducts();
    expect(second[0].price).not.toBe(-999);
    expect(second[0].name).not.toBe("TAMPERED");
  });

  it("returns a fresh array each call (not a shared reference)", () => {
    const first = listProducts();
    first.push({
      id: "injected",
      name: "Injected",
      description: "",
      price: 0,
      type: "OTC",
      category: "",
      stock: 0,
      requiresPrescription: false,
    });

    expect(listProducts()).toHaveLength(products.length);
  });
});

// AC 5 backing logic: lookup hits and misses (the route handler maps the
// null miss to a 404).
describe("findProductById", () => {
  it("returns the matching product for a known id", () => {
    const product = findProductById("prod-amoxicillin-500");

    expect(product).not.toBeNull();
    expect(product?.id).toBe("prod-amoxicillin-500");
    expect(product?.type).toBe("Rx");
  });

  it("returns null for an unknown id", () => {
    expect(findProductById("does-not-exist")).toBeNull();
  });

  it("returns a copy so mutating the result does not mutate the seed", () => {
    const product = findProductById("prod-ibuprofen-200");
    if (product) {
      product.price = -1;
    }

    expect(findProductById("prod-ibuprofen-200")?.price).not.toBe(-1);
  });
});

// MED-16: featured subset for the home page rail.
describe("listFeaturedProducts", () => {
  it("returns a non-empty, deterministic subset", () => {
    const first = listFeaturedProducts();
    expect(first.length).toBeGreaterThan(0);
    expect(first).toEqual(listFeaturedProducts());
  });

  it("never returns more than FEATURED_LIMIT products", () => {
    expect(listFeaturedProducts().length).toBeLessThanOrEqual(FEATURED_LIMIT);
  });

  it("returns only products explicitly flagged featured when any are flagged", () => {
    const flaggedCount = products.filter((p) => p.featured === true).length;
    expect(flaggedCount).toBeGreaterThan(0);

    for (const product of listFeaturedProducts()) {
      expect(product.featured).toBe(true);
    }
  });

  it("includes both an OTC and an Rx product for a believable mix", () => {
    const featured = listFeaturedProducts();
    expect(featured.some((p) => p.type === "OTC")).toBe(true);
    expect(featured.some((p) => p.type === "Rx")).toBe(true);
  });

  it("returns copies so mutating the result does not mutate the seed", () => {
    const featured = listFeaturedProducts();
    featured[0].price = -999;
    expect(listFeaturedProducts()[0].price).not.toBe(-999);
  });
});

// AC 8: seed must include a believable mix of OTC and Rx products.
describe("product seed coverage", () => {
  it("includes at least one OTC and at least one Rx product", () => {
    const all = listProducts();
    expect(all.some((p) => p.type === "OTC")).toBe(true);
    expect(all.some((p) => p.type === "Rx")).toBe(true);
  });

  it("marks every Rx product as requiring a prescription and OTC products as not", () => {
    for (const product of listProducts()) {
      expect(product.requiresPrescription).toBe(product.type === "Rx");
    }
  });

  it("uses unique product ids across the seed", () => {
    const ids = listProducts().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
