import { normalizeShipping, validateShipping, type FieldErrors } from "@/lib/orders/checkout";
import type {
  AccountState,
  InsuranceInfo,
  SavedAddress,
} from "@/lib/account/types";

// Pure account-update logic: validate + apply address (PII) and insurance (PHI)
// edits to an account state, returning a NEW state (never mutating the input).
// Framework-free and unit-tested. Ids for new addresses are derived
// deterministically from an injected sequence (no RNG).

export type AddressInput = {
  id?: string;
  label?: string;
  fullName?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
};

export type AddressResult =
  | { ok: true; state: AccountState }
  | { ok: false; errors: FieldErrors };

// Account-scoped format rules. These live HERE (not in the shared
// `validateShipping`) on purpose: checkout must keep its seeded postal behavior
// (FN_POSTAL_UNVALIDATED) untouched, so the stricter format checks apply only to
// account address edits. Each check runs only when the field is non-blank — the
// required-field errors from `validateShipping` already cover empties, so we
// never stack a "required" and a "format" error on the same field.
const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u; // letters (any script), space . ' -
const US_ZIP_RE = /^\d{5}(-\d{4})?$/;
const INTL_POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/;
const MAX_LABEL = 40;

function isUsCountry(country: string): boolean {
  const c = country.trim().toUpperCase();
  return c === "" || c === "USA" || c === "US" || c === "UNITED STATES";
}

/**
 * Validates an address input — label plus all shipping fields are required
 * (via `validateShipping`), and, additionally, name / postal-code FORMAT are
 * checked (account-only; see the note on the format constants above).
 */
export function validateAddress(input: AddressInput): FieldErrors {
  const errors = validateShipping(input);

  const label = (input.label ?? "").trim();
  if (label.length === 0) {
    errors["address.label"] = "Label is required.";
  } else if (label.length > MAX_LABEL) {
    errors["address.label"] = `Label must be ${MAX_LABEL} characters or fewer.`;
  }

  const fullName = (input.fullName ?? "").trim();
  if (fullName && !NAME_RE.test(fullName)) {
    errors["shipping.fullName"] = "Enter a valid name (letters, spaces, . ' - only).";
  }

  const postalCode = (input.postalCode ?? "").trim();
  if (postalCode && !errors["shipping.postalCode"]) {
    if (isUsCountry(input.country ?? "")) {
      if (!US_ZIP_RE.test(postalCode)) {
        errors["shipping.postalCode"] = "Enter a valid US ZIP code (e.g. 97201 or 97201-1234).";
      }
    } else if (!INTL_POSTAL_RE.test(postalCode)) {
      errors["shipping.postalCode"] = "Enter a valid postal code.";
    }
  }

  return errors;
}

/**
 * Adds a new address or updates an existing one (matched by id). Returns a new
 * account state on success, or field errors. `sequence` derives a stable id for
 * a newly-added address.
 */
export function saveAddress(
  state: AccountState,
  input: AddressInput,
  sequence: number,
): AddressResult {
  const errors = validateAddress(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const normalized: SavedAddress = {
    ...normalizeShipping(input),
    id: input.id ?? `addr-${sequence}`,
    label: (input.label ?? "").trim(),
  };

  const addresses = [...state.addresses];
  const existingIndex = input.id
    ? addresses.findIndex((address) => address.id === input.id)
    : -1;

  if (existingIndex >= 0) {
    addresses[existingIndex] = normalized;
  } else {
    addresses.push(normalized);
  }

  return { ok: true, state: { ...state, addresses } };
}

/**
 * Removes a saved address by id, returning a NEW state. A no-op (returns an
 * equivalent new state) if the id isn't present — deleting an absent address is
 * idempotent, not an error.
 */
export function removeAddress(state: AccountState, addressId: string): AccountState {
  return {
    ...state,
    addresses: state.addresses.filter((address) => address.id !== addressId),
  };
}

export type InsuranceInput = Partial<InsuranceInfo>;

export type InsuranceResult =
  | { ok: true; state: AccountState }
  | { ok: false; errors: FieldErrors };

const INSURANCE_FIELDS: { key: keyof InsuranceInfo; label: string }[] = [
  { key: "provider", label: "Provider" },
  { key: "memberId", label: "Member ID" },
  { key: "groupNumber", label: "Group number" },
];

// Member ID / group number are identifier-like: letters, digits and hyphens,
// at least 3 chars. Provider is free text (name-like) and stays required-only.
const INSURANCE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,}$/;

/**
 * Validates insurance — all three fields required, plus a format check on the
 * member ID and group number so obvious garbage is rejected.
 */
export function validateInsurance(input: InsuranceInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const { key, label } of INSURANCE_FIELDS) {
    const value = input[key];
    if (!value || value.trim().length === 0) {
      errors[`insurance.${key}`] = `${label} is required.`;
    }
  }

  for (const key of ["memberId", "groupNumber"] as const) {
    const value = (input[key] ?? "").trim();
    if (value && !errors[`insurance.${key}`] && !INSURANCE_ID_RE.test(value)) {
      const label = key === "memberId" ? "Member ID" : "Group number";
      errors[`insurance.${key}`] = `${label} may use letters, numbers, and hyphens.`;
    }
  }

  return errors;
}

/**
 * Clears insurance (PHI) back to empty, returning a NEW state. This is a
 * deliberate "remove" action, so — unlike `saveInsurance` — it does NOT run the
 * all-fields-required validation; blank is the intended result.
 */
export function clearInsurance(state: AccountState): AccountState {
  return {
    ...state,
    insurance: { provider: "", memberId: "", groupNumber: "" },
  };
}

/** Updates insurance (PHI). Returns a new account state on success. */
export function saveInsurance(
  state: AccountState,
  input: InsuranceInput,
): InsuranceResult {
  const errors = validateInsurance(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    state: {
      ...state,
      insurance: {
        provider: (input.provider ?? "").trim(),
        memberId: (input.memberId ?? "").trim(),
        groupNumber: (input.groupNumber ?? "").trim(),
      },
    },
  };
}
