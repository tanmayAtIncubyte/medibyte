import { afterEach, describe, expect, it } from "vitest";

import { resetAccounts } from "@/lib/data/account-store";
import {
  readAccount,
  updateAddress,
  updateInsurance,
} from "@/lib/account/account-service";

afterEach(() => {
  resetAccounts();
});

const validAddress = {
  label: "Work",
  fullName: "Dana Customer",
  street: "1 Market St",
  city: "Portland",
  region: "OR",
  postalCode: "97204",
  country: "USA",
};

describe("account service (per-session, per-user)", () => {
  it("reads a seed customer's seeded account state", () => {
    const account = readAccount("user-customer-dana");
    expect(account.addresses[0].label).toBe("Home");
    expect(account.insurance.provider).toBe("BlueCross BlueShield");
  });

  it("persists an added address for the session and reads it back", () => {
    const result = updateAddress("user-customer-dana", validAddress);
    expect(result.ok).toBe(true);
    expect(readAccount("user-customer-dana").addresses).toHaveLength(2);
  });

  it("persists an insurance edit for the session", () => {
    updateInsurance("user-customer-dana", {
      provider: "Aetna",
      memberId: "A-1",
      groupNumber: "G-1",
    });
    expect(readAccount("user-customer-dana").insurance.provider).toBe("Aetna");
  });

  it("isolates one user's edits from another's account (own-account only)", () => {
    updateAddress("user-customer-dana", validAddress);
    // Omar's account is untouched by Dana's edit.
    expect(readAccount("user-customer-omar").addresses).toHaveLength(1);
    expect(readAccount("user-customer-omar").addresses[0].label).toBe("Home");
  });

  it("rejects invalid edits with field errors and does not persist", () => {
    const result = updateInsurance("user-customer-dana", { provider: "Aetna" });
    expect(result.ok).toBe(false);
    // unchanged
    expect(readAccount("user-customer-dana").insurance.provider).toBe("BlueCross BlueShield");
  });
});
