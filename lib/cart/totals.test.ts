import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import {
  buildCartLines,
  computeCartTotals,
  roundMoney,
  TAX_RATE,
} from "@/lib/cart/totals";

function product(id: string, price: number): Product {
  return {
    id,
    name: id,
    description: "",
    price,
    type: "OTC",
    category: "General",
    stock: 100,
    requiresPrescription: false,
  };
}

const catalog: Record<string, Product> = {
  a: product("a", 6.99),
  b: product("b", 8.5),
  c: product("c", 10),
};

const find = (id: string) => catalog[id] ?? null;

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(6.994)).toBe(6.99);
    expect(roundMoney(6.995)).toBe(7);
  });

  it("avoids floating point drift (0.1 * 3)", () => {
    expect(roundMoney(0.1 * 3)).toBe(0.3);
  });
});

describe("buildCartLines", () => {
  it("prices each line as unit price * quantity, rounded", () => {
    const lines = buildCartLines(
      [{ productId: "a", quantity: 3 }],
      find,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].lineTotal).toBe(roundMoney(6.99 * 3)); // 20.97
  });

  it("drops items whose product no longer exists", () => {
    const lines = buildCartLines(
      [
        { productId: "a", quantity: 1 },
        { productId: "ghost", quantity: 2 },
      ],
      find,
    );
    expect(lines.map((l) => l.product.id)).toEqual(["a"]);
  });

  it("drops items with non-positive quantity", () => {
    expect(buildCartLines([{ productId: "a", quantity: 0 }], find)).toEqual([]);
  });
});

describe("computeCartTotals", () => {
  it("returns zeros for an empty cart", () => {
    const totals = computeCartTotals([]);
    expect(totals).toMatchObject({
      itemCount: 0,
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
  });

  it("sums subtotal and item count across lines", () => {
    const lines = buildCartLines(
      [
        { productId: "a", quantity: 2 }, // 13.98
        { productId: "b", quantity: 1 }, // 8.50
      ],
      find,
    );
    const totals = computeCartTotals(lines);
    expect(totals.subtotal).toBe(22.48);
    expect(totals.itemCount).toBe(3);
  });

  it("charges tax on the subtotal and adds it to the total", () => {
    const lines = buildCartLines([{ productId: "c", quantity: 1 }], find); // 10
    const totals = computeCartTotals(lines);
    expect(totals.tax).toBe(roundMoney(10 * TAX_RATE)); // 0.80
    expect(totals.total).toBe(10.8);
  });

  it("applies a discount before tax and reflects it in the total", () => {
    const lines = buildCartLines([{ productId: "c", quantity: 1 }], find); // 10
    const totals = computeCartTotals(lines, 2);
    expect(totals.discount).toBe(2);
    expect(totals.tax).toBe(roundMoney(8 * TAX_RATE)); // 0.64
    expect(totals.total).toBe(8.64);
  });

  it("clamps a discount larger than the subtotal (no negative total)", () => {
    const lines = buildCartLines([{ productId: "c", quantity: 1 }], find); // 10
    const totals = computeCartTotals(lines, 999);
    expect(totals.discount).toBe(10);
    expect(totals.total).toBe(0);
  });

  it("ignores a negative discount", () => {
    const lines = buildCartLines([{ productId: "c", quantity: 1 }], find);
    expect(computeCartTotals(lines, -5).discount).toBe(0);
  });
});
