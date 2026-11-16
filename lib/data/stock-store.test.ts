import { afterEach, describe, expect, it } from "vitest";

import { products } from "@/data/products";
import {
  getAvailableStock,
  getReservedStock,
  reserveStock,
  reserveStockRacy,
  reserveStockUnchecked,
  resetStock,
} from "@/lib/data/stock-store";

// Stock baseline: available = seed stock - reserved; reservation is atomic
// (all-or-nothing) in one read-modify-write, so the clean path can never
// oversell or double-spend. The bug paths (unchecked / racy) deliberately
// break that.

const PRODUCT = "prod-decongestant"; // seed stock 8
const SEED = products.find((p) => p.id === PRODUCT)!.stock; // 8

afterEach(async () => {
  await resetStock();
});

describe("stock baseline — getAvailableStock", () => {
  it("starts at the seed stock", async () => {
    expect(await getAvailableStock(PRODUCT)).toBe(SEED);
  });

  it("returns 0 for an unknown product", async () => {
    expect(await getAvailableStock("prod-nope")).toBe(0);
  });
});

describe("stock baseline — reserveStock (atomic)", () => {
  it("decrements available stock on a successful reservation", async () => {
    const result = await reserveStock([{ productId: PRODUCT, quantity: 3 }]);
    expect(result.ok).toBe(true);
    expect(await getAvailableStock(PRODUCT)).toBe(SEED - 3);
    expect(await getReservedStock(PRODUCT)).toBe(3);
  });

  it("rejects an oversell and reserves nothing (all-or-nothing)", async () => {
    const result = await reserveStock([{ productId: PRODUCT, quantity: SEED + 1 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.shortages).toEqual([
        { productId: PRODUCT, requested: SEED + 1, available: SEED },
      ]);
    }
    // Nothing was reserved.
    expect(await getAvailableStock(PRODUCT)).toBe(SEED);
  });

  it("rejects the whole multi-line order if any one line oversells", async () => {
    const result = await reserveStock([
      { productId: "prod-ibuprofen-200", quantity: 1 },
      { productId: PRODUCT, quantity: SEED + 5 },
    ]);
    expect(result.ok).toBe(false);
    // The good line was NOT reserved because the order is all-or-nothing.
    expect(await getReservedStock("prod-ibuprofen-200")).toBe(0);
    expect(await getAvailableStock(PRODUCT)).toBe(SEED);
  });

  it("two sequential reservations cannot exceed seed stock", async () => {
    expect((await reserveStock([{ productId: PRODUCT, quantity: 5 }])).ok).toBe(true);
    // Only 3 left; a second request for 5 must fail.
    expect((await reserveStock([{ productId: PRODUCT, quantity: 5 }])).ok).toBe(false);
    expect(await getReservedStock(PRODUCT)).toBe(5);
  });
});

describe("stock bug paths", () => {
  it("reserveStockUnchecked drives availability negative (oversell)", async () => {
    const result = await reserveStockUnchecked([
      { productId: PRODUCT, quantity: SEED + 4 },
    ]);
    expect(result.ok).toBe(true);
    expect(await getReservedStock(PRODUCT)).toBe(SEED + 4); // more reserved than seeded
    expect(await getAvailableStock(PRODUCT)).toBe(0); // clamped display, but oversold
  });

  it("reserveStockRacy lets two concurrent callers double-spend the same units", async () => {
    // Both snapshot SEED available, both decide the order fits, then both commit
    // — the check-then-act race the atomic path does not have. The window is now
    // a real timer (here shrunk to 10ms for speed; defaults to ~300ms in prod so
    // a rapid HTTP double-submit lands two requests inside the same window).
    const [a, b] = await Promise.all([
      reserveStockRacy([{ productId: PRODUCT, quantity: SEED }], 10),
      reserveStockRacy([{ productId: PRODUCT, quantity: SEED }], 10),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    // 2 x SEED reserved against only SEED in stock — double-spent.
    expect(await getReservedStock(PRODUCT)).toBe(SEED * 2);
  });

  it("reserveStockRacy with the default real window still double-spends (HTTP-reproducible)", async () => {
    // No explicit delay → uses the production RACE_WINDOW_MS window. Two near-
    // simultaneous callers (as two quick HTTP checkouts would be) both pass the
    // check before either commits.
    const [a, b] = await Promise.all([
      reserveStockRacy([{ productId: PRODUCT, quantity: SEED }]),
      reserveStockRacy([{ productId: PRODUCT, quantity: SEED }]),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(await getReservedStock(PRODUCT)).toBe(SEED * 2);
  });
});
