import type { ProductType } from "@/data/products";

// Order domain types. Shared by the pure order logic, the in-memory order
// store, the seed historical orders, and the order/checkout pages. Safe to
// import on the client (types only — no runtime dependencies).

export type OrderStatus = "processing" | "shipped" | "delivered";

// A priced snapshot of a single product at the time the order was placed. The
// snapshot is frozen at purchase time so later catalog/price changes never
// rewrite history (totals on an order must match the cart at time of purchase).
export type OrderItem = {
  productId: string;
  name: string;
  type: ProductType;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

// Totals snapshot — mirrors the cart totals breakdown at time of purchase.
export type OrderTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  couponCode: string | null;
};

// Shipping address (PII). Captured at checkout; never placed in URLs/logs.
export type ShippingAddress = {
  fullName: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

// Prescription / health details (PHI) captured for a single Rx line item.
// Required only when the cart contains Rx products. Kept server-side.
export type PrescriptionInfo = {
  productId: string;
  productName: string;
  patientName: string;
  dateOfBirth: string;
  prescribingDoctor: string;
  prescriptionNumber: string;
  notes: string;
};

export type Order = {
  id: string;
  userId: string;
  placedAt: string; // ISO timestamp
  status: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  shipping: ShippingAddress;
  prescriptions: PrescriptionInfo[]; // empty for OTC-only orders
};
