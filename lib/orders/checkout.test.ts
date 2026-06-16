import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";
import type { CartLine } from "@/lib/cart/totals";
import {
  cartRequiresPrescription,
  normalizeShipping,
  rxLines,
  validateCheckout,
  validatePrescription,
  validateShipping,
} from "@/lib/orders/checkout";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-ibuprofen-200",
    name: "Ibuprofen 200mg Tablets (50 ct)",
    description: "Pain reliever",
    price: 6.99,
    type: "OTC",
    category: "Pain Relief",
    stock: 100,
    requiresPrescription: false,
    ...overrides,
  };
}

function line(p: Product, quantity = 1): CartLine {
  return { product: p, quantity, lineTotal: p.price * quantity };
}

const otcLine = line(product());
const rxLine = line(
  product({
    id: "prod-lisinopril-10",
    name: "Lisinopril 10mg Tablets (30 ct)",
    type: "Rx",
    requiresPrescription: true,
  }),
);

const fullShipping = {
  fullName: "Dana Customer",
  street: "412 Birch Lane",
  city: "Portland",
  region: "OR",
  postalCode: "97201",
  country: "USA",
};

const fullPhi = {
  patientName: "Dana Customer",
  dateOfBirth: "1984-06-30",
  prescribingDoctor: "Dr. Marsh",
  prescriptionNumber: "RX-1",
  notes: "daily",
};

describe("validateShipping", () => {
  it("accepts a complete address with no errors", () => {
    expect(validateShipping(fullShipping)).toEqual({});
  });

  it("flags every missing required field", () => {
    const errors = validateShipping({});
    expect(Object.keys(errors)).toEqual([
      "shipping.fullName",
      "shipping.street",
      "shipping.city",
      "shipping.region",
      "shipping.postalCode",
      "shipping.country",
    ]);
  });

  it("treats whitespace-only values as missing", () => {
    const errors = validateShipping({ ...fullShipping, city: "   " });
    expect(errors).toHaveProperty("shipping.city");
  });
});

describe("normalizeShipping", () => {
  it("trims all fields", () => {
    expect(normalizeShipping({ ...fullShipping, city: "  Portland  " }).city).toBe("Portland");
  });
});

describe("cartRequiresPrescription / rxLines", () => {
  it("is false for an OTC-only cart", () => {
    expect(cartRequiresPrescription([otcLine])).toBe(false);
    expect(rxLines([otcLine])).toEqual([]);
  });

  it("is true when any line is Rx", () => {
    expect(cartRequiresPrescription([otcLine, rxLine])).toBe(true);
    expect(rxLines([otcLine, rxLine])).toEqual([rxLine]);
  });
});

describe("validatePrescription (PHI)", () => {
  it("accepts complete PHI (notes optional)", () => {
    expect(validatePrescription("p1", fullPhi)).toEqual({});
    expect(validatePrescription("p1", { ...fullPhi, notes: "" })).toEqual({});
  });

  it("requires patient name, DOB, doctor, and Rx number", () => {
    const errors = validatePrescription("p1", {});
    expect(Object.keys(errors).sort()).toEqual(
      [
        "prescription.p1.dateOfBirth",
        "prescription.p1.patientName",
        "prescription.p1.prescribingDoctor",
        "prescription.p1.prescriptionNumber",
      ].sort(),
    );
  });
});

describe("validateCheckout", () => {
  it("OTC-only cart: no prescriptions required, ok with shipping only", () => {
    const result = validateCheckout([otcLine], { shipping: fullShipping, prescriptions: {} });
    expect(result.ok).toBe(true);
    expect(result.prescriptions).toEqual([]);
  });

  it("Rx cart: requires PHI for the Rx line", () => {
    const result = validateCheckout([rxLine], { shipping: fullShipping, prescriptions: {} });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("prescription.prod-lisinopril-10.patientName");
  });

  it("Rx cart: ok and attaches normalized PHI when complete", () => {
    const result = validateCheckout([rxLine], {
      shipping: fullShipping,
      prescriptions: { "prod-lisinopril-10": fullPhi },
    });
    expect(result.ok).toBe(true);
    expect(result.prescriptions).toEqual([
      {
        productId: "prod-lisinopril-10",
        productName: "Lisinopril 10mg Tablets (30 ct)",
        ...fullPhi,
      },
    ]);
  });

  it("fails when shipping is incomplete even if PHI is fine", () => {
    const result = validateCheckout([rxLine], {
      shipping: { ...fullShipping, postalCode: "" },
      prescriptions: { "prod-lisinopril-10": fullPhi },
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("shipping.postalCode");
  });
});
