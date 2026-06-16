import type { CartLine } from "@/lib/cart/totals";
import type { PrescriptionInfo, ShippingAddress } from "@/lib/orders/types";

// Pure checkout validation: shipping (PII) required-field checks and, when the
// cart contains Rx items, prescription/health (PHI) required-field checks.
// Framework-free and unit-tested. Returns a map of field -> message so the
// form can render inline, accessible errors.

export type FieldErrors = Record<string, string>;

export type ShippingInput = Partial<Record<keyof ShippingAddress, string>>;

const SHIPPING_FIELDS: { key: keyof ShippingAddress; label: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "street", label: "Street address" },
  { key: "city", label: "City" },
  { key: "region", label: "State / region" },
  { key: "postalCode", label: "Postal code" },
  { key: "country", label: "Country" },
];

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

export type ShippingBugs = {
  // FN_POSTAL_UNVALIDATED: skip the required-field check on the postal code, so
  // a blank postal code passes validation. The caller (checkout route, which
  // has the user) resolves the flag and passes the boolean in, keeping this
  // validator pure.
  skipPostalValidation?: boolean;
};

/** Validates the shipping address; every field is required. */
export function validateShipping(
  input: ShippingInput,
  bugs: ShippingBugs = {},
): FieldErrors {
  const errors: FieldErrors = {};
  for (const { key, label } of SHIPPING_FIELDS) {
    if (bugs.skipPostalValidation && key === "postalCode") {
      continue;
    }
    if (isBlank(input[key])) {
      errors[`shipping.${key}`] = `${label} is required.`;
    }
  }
  return errors;
}

/** Normalizes a raw shipping input into a trimmed ShippingAddress. */
export function normalizeShipping(input: ShippingInput): ShippingAddress {
  return {
    fullName: (input.fullName ?? "").trim(),
    street: (input.street ?? "").trim(),
    city: (input.city ?? "").trim(),
    region: (input.region ?? "").trim(),
    postalCode: (input.postalCode ?? "").trim(),
    country: (input.country ?? "").trim(),
  };
}

/** The Rx (prescription-required) lines in a cart that need PHI capture. */
export function rxLines(lines: readonly CartLine[]): CartLine[] {
  return lines.filter((line) => line.product.requiresPrescription);
}

/** True when the cart needs the prescription/health step at all. */
export function cartRequiresPrescription(lines: readonly CartLine[]): boolean {
  return rxLines(lines).length > 0;
}

export type PrescriptionInput = Partial<
  Record<keyof Omit<PrescriptionInfo, "productId" | "productName">, string>
>;

const PHI_FIELDS: {
  key: keyof PrescriptionInput;
  label: string;
  required: boolean;
}[] = [
  { key: "patientName", label: "Patient name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "prescribingDoctor", label: "Prescribing doctor", required: true },
  { key: "prescriptionNumber", label: "Prescription number", required: true },
  // Notes are optional free-text (condition / dosage notes).
  { key: "notes", label: "Notes", required: false },
];

/**
 * Validates the PHI captured for a single Rx line. Required when an Rx item is
 * present; OTC-only carts never reach this. Errors are keyed by
 * `prescription.<productId>.<field>` so each Rx line surfaces its own errors.
 */
export function validatePrescription(
  productId: string,
  input: PrescriptionInput,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const { key, label, required } of PHI_FIELDS) {
    if (required && isBlank(input[key])) {
      errors[`prescription.${productId}.${key}`] = `${label} is required.`;
    }
  }
  return errors;
}

/** Normalizes raw PHI input into a PrescriptionInfo (trimmed). */
export function normalizePrescription(
  productId: string,
  productName: string,
  input: PrescriptionInput,
): PrescriptionInfo {
  return {
    productId,
    productName,
    patientName: (input.patientName ?? "").trim(),
    dateOfBirth: (input.dateOfBirth ?? "").trim(),
    prescribingDoctor: (input.prescribingDoctor ?? "").trim(),
    prescriptionNumber: (input.prescriptionNumber ?? "").trim(),
    notes: (input.notes ?? "").trim(),
  };
}

export type CheckoutInput = {
  shipping: ShippingInput;
  // Keyed by productId — the PHI captured for each Rx line, if any.
  prescriptions: Record<string, PrescriptionInput>;
};

export type CheckoutValidation = {
  ok: boolean;
  errors: FieldErrors;
  shipping: ShippingAddress;
  prescriptions: PrescriptionInfo[];
};

/**
 * Validates a whole checkout submission against the current cart lines. The
 * cart is empty-checked by the caller; this assumes there are lines to buy.
 * Produces normalized shipping + per-Rx PHI ready to attach to an order when
 * `ok` is true.
 */
export function validateCheckout(
  lines: readonly CartLine[],
  input: CheckoutInput,
  shippingBugs: ShippingBugs = {},
): CheckoutValidation {
  const errors: FieldErrors = { ...validateShipping(input.shipping, shippingBugs) };

  const prescriptions: PrescriptionInfo[] = [];
  for (const line of rxLines(lines)) {
    const raw = input.prescriptions[line.product.id] ?? {};
    Object.assign(errors, validatePrescription(line.product.id, raw));
    prescriptions.push(
      normalizePrescription(line.product.id, line.product.name, raw),
    );
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    shipping: normalizeShipping(input.shipping),
    prescriptions,
  };
}
