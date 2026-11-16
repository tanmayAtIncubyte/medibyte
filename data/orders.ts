import type { Order } from "@/lib/orders/types";

// Deterministic historical orders for the seed customers, so `/orders` has
// content on a fresh login and cross-customer access control can be exercised
// (dana must NOT be able to view omar's order, and vice versa). No DB, no RNG —
// fixed ids, timestamps, and price snapshots. Phase-3 seeds only a few orders
// per customer (the full ~300-order dataset is out of scope).
//
// Item price snapshots match data/products.ts at seed time. Each order carries
// a totals snapshot (8% tax on the post-discount subtotal, mirroring
// lib/cart/totals.ts) plus shipping (PII) and, for Rx orders, prescription PHI.

export const seedOrders: readonly Order[] = [
  // --- Dana: an OTC-only order (no prescription step) ---
  {
    id: "MB-20260112-0001",
    userId: "user-customer-dana",
    placedAt: "2026-01-12T15:30:00.000Z",
    status: "delivered",
    items: [
      {
        productId: "prod-ibuprofen-200",
        name: "Ibuprofen 200mg Tablets (50 ct)",
        type: "OTC",
        unitPrice: 6.99,
        quantity: 2,
        lineTotal: 13.98,
      },
      {
        productId: "prod-aspirin-81",
        name: "Low-Dose Aspirin 81mg Tablets (120 ct)",
        type: "OTC",
        unitPrice: 4.99,
        quantity: 1,
        lineTotal: 4.99,
      },
    ],
    totals: {
      subtotal: 18.97,
      discount: 0,
      tax: 1.52,
      total: 20.49,
      couponCode: null,
    },
    shipping: {
      fullName: "Dana Customer",
      street: "412 Birch Lane",
      city: "Portland",
      region: "OR",
      postalCode: "97201",
      country: "USA",
    },
    prescriptions: [],
  },

  // --- Dana: an Rx order (carries prescription PHI) ---
  {
    id: "MB-20260228-0002",
    userId: "user-customer-dana",
    placedAt: "2026-02-28T09:05:00.000Z",
    status: "shipped",
    items: [
      {
        productId: "prod-lisinopril-10",
        name: "Lisinopril 10mg Tablets (30 ct)",
        type: "Rx",
        unitPrice: 14.5,
        quantity: 1,
        lineTotal: 14.5,
      },
    ],
    totals: {
      subtotal: 14.5,
      discount: 0,
      tax: 1.16,
      total: 15.66,
      couponCode: null,
    },
    shipping: {
      fullName: "Dana Customer",
      street: "412 Birch Lane",
      city: "Portland",
      region: "OR",
      postalCode: "97201",
      country: "USA",
    },
    prescriptions: [
      {
        productId: "prod-lisinopril-10",
        productName: "Lisinopril 10mg Tablets (30 ct)",
        patientName: "Dana Customer",
        dateOfBirth: "1984-06-30",
        prescribingDoctor: "Dr. Elena Marsh",
        prescriptionNumber: "RX-771204",
        notes: "Once daily for blood pressure management.",
      },
    ],
  },

  // --- Omar: an Rx order with a coupon discount applied ---
  {
    id: "MB-20260305-0001",
    userId: "user-customer-omar",
    placedAt: "2026-03-05T18:42:00.000Z",
    status: "processing",
    items: [
      {
        productId: "prod-metformin-500",
        name: "Metformin 500mg Tablets (60 ct)",
        type: "Rx",
        unitPrice: 16.25,
        quantity: 2,
        lineTotal: 32.5,
      },
      {
        productId: "prod-acetaminophen-500",
        name: "Acetaminophen 500mg Caplets (100 ct)",
        type: "OTC",
        unitPrice: 8.49,
        quantity: 1,
        lineTotal: 8.49,
      },
    ],
    totals: {
      // 10% off the $40.99 subtotal -> $4.10 discount; 8% tax on $36.89.
      subtotal: 40.99,
      discount: 4.1,
      tax: 2.95,
      total: 39.84,
      couponCode: "SAVE10",
    },
    shipping: {
      fullName: "Omar Customer",
      street: "88 Cedar Court, Apt 3B",
      city: "Austin",
      region: "TX",
      postalCode: "73301",
      country: "USA",
    },
    prescriptions: [
      {
        productId: "prod-metformin-500",
        productName: "Metformin 500mg Tablets (60 ct)",
        patientName: "Omar Customer",
        dateOfBirth: "1979-11-02",
        prescribingDoctor: "Dr. Priya Nair",
        prescriptionNumber: "RX-558310",
        notes: "Take with meals.",
      },
    ],
  },

  // --- Steve (qa_automation): an OTC-only order for Flow 3's order-history checks ---
  {
    id: "MB-20260401-0001",
    userId: "user-qa-steve",
    placedAt: "2026-04-01T13:20:00.000Z",
    status: "delivered",
    items: [
      {
        productId: "prod-ibuprofen-200",
        name: "Ibuprofen 200mg Tablets (50 ct)",
        type: "OTC",
        unitPrice: 6.99,
        quantity: 1,
        lineTotal: 6.99,
      },
      {
        productId: "prod-acetaminophen-500",
        name: "Acetaminophen 500mg Caplets (100 ct)",
        type: "OTC",
        unitPrice: 8.49,
        quantity: 1,
        lineTotal: 8.49,
      },
    ],
    totals: {
      subtotal: 15.48,
      discount: 0,
      tax: 1.24,
      total: 16.72,
      couponCode: null,
    },
    shipping: {
      fullName: "Steve QA",
      street: "215 Maple Avenue",
      city: "Denver",
      region: "CO",
      postalCode: "80202",
      country: "USA",
    },
    prescriptions: [],
  },
];
