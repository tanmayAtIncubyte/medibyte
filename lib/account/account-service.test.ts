import { afterEach, describe, expect, it } from "vitest";

import { resetAccounts } from "@/lib/data/account-store";
import {
  deleteAddress,
  readAccount,
  removeInsurance,
  updateAddress,
  updateInsurance,
} from "@/lib/account/account-service";

afterEach(async () => {
  await resetAccounts();
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
  it("reads a seed customer's seeded account state", async () => {
    const account = await readAccount("user-customer-dana");
    expect(account.addresses[0].label).toBe("Home");
    expect(account.insurance.provider).toBe("BlueCross BlueShield");
  });

  it("persists an added address for the session and reads it back", async () => {
    const result = await updateAddress("user-customer-dana", validAddress);
    expect(result.ok).toBe(true);
    expect((await readAccount("user-customer-dana")).addresses).toHaveLength(2);
  });

  it("persists an insurance edit for the session", async () => {
    await updateInsurance("user-customer-dana", {
      provider: "Aetna",
      memberId: "A-1",
      groupNumber: "G-1",
    });
    expect((await readAccount("user-customer-dana")).insurance.provider).toBe("Aetna");
  });

  it("isolates one user's edits from another's account (own-account only)", async () => {
    await updateAddress("user-customer-dana", validAddress);
    // Omar's account is untouched by Dana's edit.
    expect((await readAccount("user-customer-omar")).addresses).toHaveLength(1);
    expect((await readAccount("user-customer-omar")).addresses[0].label).toBe("Home");
  });

  it("rejects invalid edits with field errors and does not persist", async () => {
    const result = await updateInsurance("user-customer-dana", { provider: "Aetna" });
    expect(result.ok).toBe(false);
    // unchanged
    expect((await readAccount("user-customer-dana")).insurance.provider).toBe("BlueCross BlueShield");
  });

  it("deletes a saved address and persists the removal", async () => {
    const added = await updateAddress("user-customer-dana", validAddress);
    if (!added.ok) throw new Error("setup failed");
    const newId = added.state.addresses.find((a) => a.label === "Work")!.id;
    const result = await deleteAddress("user-customer-dana", newId);
    expect(result.ok).toBe(true);
    const after = await readAccount("user-customer-dana");
    expect(after.addresses.some((a) => a.id === newId)).toBe(false);
    expect(after.addresses).toHaveLength(1);
  });

  it("deleting an unknown address id is a no-op success", async () => {
    const result = await deleteAddress("user-customer-dana", "addr-nope");
    expect(result.ok).toBe(true);
    expect((await readAccount("user-customer-dana")).addresses).toHaveLength(1);
  });

  it("removes (clears) insurance without validation and persists it", async () => {
    const result = await removeInsurance("user-customer-dana");
    expect(result.ok).toBe(true);
    expect((await readAccount("user-customer-dana")).insurance).toEqual({
      provider: "",
      memberId: "",
      groupNumber: "",
    });
  });

  it("one user's delete does not touch another user's addresses", async () => {
    await deleteAddress("user-customer-dana", (await readAccount("user-customer-dana")).addresses[0].id);
    expect((await readAccount("user-customer-omar")).addresses).toHaveLength(1);
  });
});
