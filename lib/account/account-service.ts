import {
  getAccountState,
  nextAddressSequence,
  setAccountState,
} from "@/lib/data/account-store";
import {
  saveAddress,
  saveInsurance,
  type AddressInput,
  type InsuranceInput,
} from "@/lib/account/account";
import type { AccountState } from "@/lib/account/types";
import type { FieldErrors } from "@/lib/orders/checkout";

// Server-side account orchestration over the in-memory store + pure logic. The
// caller always passes the userId resolved from the signed session — never from
// the client — so a customer can only read/edit their OWN account state.

export type AccountUpdateResult =
  | { ok: true; state: AccountState }
  | { ok: false; errors: FieldErrors };

export function readAccount(userId: string): AccountState {
  return getAccountState(userId);
}

export function updateAddress(userId: string, input: AddressInput): AccountUpdateResult {
  const result = saveAddress(getAccountState(userId), input, nextAddressSequence(userId));
  if (!result.ok) {
    return result;
  }
  setAccountState(userId, result.state);
  return { ok: true, state: result.state };
}

export function updateInsurance(userId: string, input: InsuranceInput): AccountUpdateResult {
  const result = saveInsurance(getAccountState(userId), input);
  if (!result.ok) {
    return result;
  }
  setAccountState(userId, result.state);
  return { ok: true, state: result.state };
}
