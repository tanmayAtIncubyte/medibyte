import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import {
  bloatProductsPayload,
  simulateDelay,
} from "@/lib/perf/simulated-latency";

// Unit tests for the SIMULATED performance-defect helpers. These prove the
// buggy *shape* (a real delay; a bloated payload) without measuring wall-clock
// timing in the toggle tests.

const sample: Product[] = [
  {
    id: "prod-a",
    name: "Ibuprofen 200mg",
    description: "Pain reliever.",
    price: 6.99,
    type: "OTC",
    category: "Pain Relief",
    stock: 10,
    requiresPrescription: false,
  },
];

describe("simulateDelay", () => {
  it("resolves after roughly the requested delay", async () => {
    const start = Date.now();
    await simulateDelay(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe("bloatProductsPayload", () => {
  it("keeps every original product field on each item", () => {
    const [bloated] = bloatProductsPayload(sample) as Array<Record<string, unknown>>;
    expect(bloated).toMatchObject(sample[0]);
  });

  it("adds large unused fields the lean payload does not have", () => {
    const [bloated] = bloatProductsPayload(sample) as Array<Record<string, unknown>>;
    expect(bloated).toHaveProperty("_raw");
    expect(bloated).toHaveProperty("_duplicate");
    expect(bloated).toHaveProperty("_seoKeywords");
    expect(bloated).toHaveProperty("_auditTrail");
  });

  it("serializes far larger than the lean payload", () => {
    const lean = JSON.stringify(sample);
    const bloated = JSON.stringify(bloatProductsPayload(sample));
    expect(bloated.length).toBeGreaterThan(lean.length * 5);
  });
});
