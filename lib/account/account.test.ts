import { describe, expect, it } from "vitest";

import {
  clearInsurance,
  removeAddress,
  saveAddress,
  saveInsurance,
  validateAddress,
  validateInsurance,
} from "@/lib/account/account";
import type { AccountState } from "@/lib/account/types";

function state(): AccountState {
  return {
    addresses: [
      {
        id: "addr-home",
        label: "Home",
        fullName: "Dana Customer",
        street: "412 Birch Lane",
        city: "Portland",
        region: "OR",
        postalCode: "97201",
        country: "USA",
      },
    ],
    insurance: { provider: "BCBS", memberId: "M-1", groupNumber: "G-1" },
  };
}

const newAddress = {
  label: "Work",
  fullName: "Dana Customer",
  street: "1 Market St",
  city: "Portland",
  region: "OR",
  postalCode: "97204",
  country: "USA",
};

describe("validateAddress", () => {
  it("accepts a complete address", () => {
    expect(validateAddress(newAddress)).toEqual({});
  });

  it("requires a label and the shipping fields", () => {
    const errors = validateAddress({});
    expect(errors).toHaveProperty("address.label");
    expect(errors).toHaveProperty("shipping.street");
  });

  it("rejects a non-numeric US postal code but accepts a valid ZIP / ZIP+4", () => {
    expect(validateAddress({ ...newAddress, postalCode: "abcde" })).toHaveProperty(
      "shipping.postalCode",
    );
    expect(validateAddress({ ...newAddress, postalCode: "9720" })).toHaveProperty(
      "shipping.postalCode",
    );
    expect(validateAddress({ ...newAddress, postalCode: "97204" })).not.toHaveProperty(
      "shipping.postalCode",
    );
    expect(
      validateAddress({ ...newAddress, postalCode: "97204-1234" }),
    ).not.toHaveProperty("shipping.postalCode");
  });

  it("allows alphanumeric postal codes for non-US countries", () => {
    expect(
      validateAddress({ ...newAddress, country: "UK", postalCode: "SW1A 1AA" }),
    ).not.toHaveProperty("shipping.postalCode");
  });

  it("rejects a full name with digits and does not double up with the required error", () => {
    expect(validateAddress({ ...newAddress, fullName: "Dana123" })).toHaveProperty(
      "shipping.fullName",
    );
    // blank name → only the required error, never a format error
    expect(validateAddress({ ...newAddress, fullName: "" })["shipping.fullName"]).toBe(
      "Full name is required.",
    );
  });

  it("rejects an over-long label", () => {
    expect(
      validateAddress({ ...newAddress, label: "x".repeat(41) }),
    ).toHaveProperty("address.label");
  });
});

describe("saveAddress", () => {
  it("adds a new address with a derived id without mutating the input state", () => {
    const before = state();
    const result = saveAddress(before, newAddress, 5);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.addresses).toHaveLength(2);
      expect(result.state.addresses[1].id).toBe("addr-5");
      expect(result.state.addresses[1].label).toBe("Work");
    }
    expect(before.addresses).toHaveLength(1); // unchanged
  });

  it("updates an existing address matched by id", () => {
    const result = saveAddress(state(), { ...newAddress, id: "addr-home", label: "Home" }, 9);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.addresses).toHaveLength(1);
      expect(result.state.addresses[0].street).toBe("1 Market St");
    }
  });

  it("rejects an incomplete address with field errors", () => {
    const result = saveAddress(state(), { label: "Work" }, 1);
    expect(result.ok).toBe(false);
  });
});

describe("validateInsurance / saveInsurance (PHI)", () => {
  it("requires provider, member id, and group number", () => {
    expect(Object.keys(validateInsurance({}))).toEqual([
      "insurance.provider",
      "insurance.memberId",
      "insurance.groupNumber",
    ]);
  });

  it("updates insurance without mutating the input state", () => {
    const before = state();
    const result = saveInsurance(before, {
      provider: "Aetna",
      memberId: "A-9",
      groupNumber: "G-9",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.insurance).toEqual({
        provider: "Aetna",
        memberId: "A-9",
        groupNumber: "G-9",
      });
    }
    expect(before.insurance.provider).toBe("BCBS"); // unchanged
  });

  it("rejects incomplete insurance", () => {
    expect(saveInsurance(state(), { provider: "Aetna" }).ok).toBe(false);
  });

  it("rejects a member id / group number with illegal characters", () => {
    expect(
      validateInsurance({ provider: "Aetna", memberId: "bad id!", groupNumber: "G-9" }),
    ).toHaveProperty("insurance.memberId");
    expect(
      validateInsurance({ provider: "Aetna", memberId: "A-9", groupNumber: "??" }),
    ).toHaveProperty("insurance.groupNumber");
  });

  it("accepts identifier-like member id / group number (letters, digits, hyphens)", () => {
    expect(
      validateInsurance({ provider: "Aetna", memberId: "BCBS-4471209", groupNumber: "GRP-88210" }),
    ).toEqual({});
  });

  it("keeps exactly the three required-field errors for empty insurance (no format noise)", () => {
    expect(Object.keys(validateInsurance({}))).toEqual([
      "insurance.provider",
      "insurance.memberId",
      "insurance.groupNumber",
    ]);
  });
});

describe("removeAddress", () => {
  it("removes the matching address without mutating the input state", () => {
    const before = state();
    const next = removeAddress(before, "addr-home");
    expect(next.addresses).toHaveLength(0);
    expect(before.addresses).toHaveLength(1); // unchanged
  });

  it("is a no-op for an unknown id (idempotent)", () => {
    const next = removeAddress(state(), "addr-does-not-exist");
    expect(next.addresses).toHaveLength(1);
  });

  it("leaves other addresses intact", () => {
    const two = saveAddress(state(), newAddress, 2);
    if (!two.ok) throw new Error("setup failed");
    const next = removeAddress(two.state, "addr-home");
    expect(next.addresses.map((a) => a.id)).toEqual(["addr-2"]);
  });
});

describe("clearInsurance (PHI)", () => {
  it("blanks all insurance fields without running required-field validation", () => {
    const before = state();
    const next = clearInsurance(before);
    expect(next.insurance).toEqual({ provider: "", memberId: "", groupNumber: "" });
    expect(before.insurance.provider).toBe("BCBS"); // unchanged
  });
});
