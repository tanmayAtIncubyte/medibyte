import {
  getAccountState,
  nextAddressSequence,
  setAccountState,
} from "@/lib/data/account-store";
import {
  clearInsurance,
  removeAddress,
  saveAddress,
  saveInsurance,
  type AddressInput,
  type InsuranceInput,
} from "@/lib/account/account";
import type { AccountState, InsuranceInfo } from "@/lib/account/types";
import type { FieldErrors } from "@/lib/orders/checkout";

// Server-side account orchestration over the in-memory store + pure logic. The
// caller always passes the userId resolved from the signed session — never from
// the client — so a customer can only read/edit their OWN account state.

export type AccountUpdateResult =
  | { ok: true; state: AccountState }
  | { ok: false; errors: FieldErrors };

export async function readAccount(userId: string): Promise<AccountState> {
  return getAccountState(userId);
}

// SEC_PHI_OVERFETCH: the account view only needs addresses + the three insurance
// fields it renders (provider / memberId / groupNumber). The CLEAN API response
// returns exactly that. When the over-fetch bug is on (resolved at the route
// boundary, never for admins), the response is padded with sensitive PHI the
// view never uses — full SSN, date of birth, diagnosis/medication history — so a
// network sniff (or, chained off SEC_IDOR_ORDER, an attacker who has reused a
// leaked order id to find a victim) pulls PHI that should never leave the server.
export type AccountApiPayload =
  | AccountState
  | (AccountState & {
      insurance: InsuranceInfo & {
        subscriberSsn: string;
        dateOfBirth: string;
        diagnosisCodes: string[];
        medicationHistory: string[];
      };
    });

export type ReadAccountBugs = {
  overfetchPhi?: boolean;
};

export async function readAccountForApi(
  userId: string,
  bugs: ReadAccountBugs = {},
): Promise<AccountApiPayload> {
  const state = await getAccountState(userId);
  if (!bugs.overfetchPhi) {
    return state; // clean: only what the view needs
  }
  return {
    ...state,
    insurance: {
      ...state.insurance,
      // PHI the account view never renders — leaked only because of the bug.
      subscriberSsn: "521-83-9042",
      dateOfBirth: "1984-07-19",
      diagnosisCodes: ["E11.9", "I10", "F41.1"],
      medicationHistory: [
        "Metformin 500mg",
        "Lisinopril 10mg",
        "Sertraline 50mg",
      ],
    },
  };
}

export async function updateAddress(
  userId: string,
  input: AddressInput,
): Promise<AccountUpdateResult> {
  const result = saveAddress(
    await getAccountState(userId),
    input,
    await nextAddressSequence(userId),
  );
  if (!result.ok) {
    return result;
  }
  await setAccountState(userId, result.state);
  return { ok: true, state: result.state };
}

export async function updateInsurance(
  userId: string,
  input: InsuranceInput,
): Promise<AccountUpdateResult> {
  const result = saveInsurance(await getAccountState(userId), input);
  if (!result.ok) {
    return result;
  }
  await setAccountState(userId, result.state);
  return { ok: true, state: result.state };
}

// Delete a saved address (PII). Owner resolved from the session by the caller;
// the client never supplies a userId, so this can only ever affect the signed-in
// user's own addresses. Idempotent — deleting an unknown id succeeds as a no-op.
export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<AccountUpdateResult> {
  const state = removeAddress(await getAccountState(userId), addressId);
  await setAccountState(userId, state);
  return { ok: true, state };
}

// Clear insurance (PHI) back to empty. Same own-account-only guarantee as above.
export async function removeInsurance(userId: string): Promise<AccountUpdateResult> {
  const state = clearInsurance(await getAccountState(userId));
  await setAccountState(userId, state);
  return { ok: true, state };
}
