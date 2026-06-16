import { describe, expect, it } from "vitest";

import { formatPrice, stockLabel, stockStatus } from "@/lib/format";

describe("formatPrice", () => {
  it("formats whole dollars with two decimals", () => {
    expect(formatPrice(6)).toBe("$6.00");
  });

  it("formats fractional amounts to two decimals", () => {
    expect(formatPrice(6.5)).toBe("$6.50");
    expect(formatPrice(12.499)).toBe("$12.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });
});

describe("stockStatus", () => {
  it("reports out-of-stock at zero or below", () => {
    expect(stockStatus(0)).toBe("out-of-stock");
    expect(stockStatus(-1)).toBe("out-of-stock");
  });

  it("reports low-stock at or below the threshold", () => {
    expect(stockStatus(1)).toBe("low-stock");
    expect(stockStatus(10)).toBe("low-stock");
  });

  it("reports in-stock above the threshold", () => {
    expect(stockStatus(11)).toBe("in-stock");
    expect(stockStatus(500)).toBe("in-stock");
  });
});

describe("stockLabel", () => {
  it("labels out-of-stock", () => {
    expect(stockLabel(0)).toBe("Out of stock");
  });

  it("includes the remaining count for low stock", () => {
    expect(stockLabel(8)).toBe("Low stock (8 left)");
  });

  it("labels in-stock", () => {
    expect(stockLabel(120)).toBe("In stock");
  });
});
