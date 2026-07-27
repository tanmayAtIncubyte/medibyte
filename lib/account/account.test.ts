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
