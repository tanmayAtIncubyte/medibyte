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

/** Validates an address input — label plus all shipping fields are required. */
export function validateAddress(input: AddressInput): FieldErrors {
  const errors = validateShipping(input);
  if (!input.label || input.label.trim().length === 0) {
    errors["address.label"] = "Label is required.";
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

/** Validates insurance — all three fields required. */
export function validateInsurance(input: InsuranceInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const { key, label } of INSURANCE_FIELDS) {
    const value = input[key];
    if (!value || value.trim().length === 0) {
      errors[`insurance.${key}`] = `${label} is required.`;
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
