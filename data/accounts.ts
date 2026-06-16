import type { AccountState } from "@/lib/account/types";

// Deterministic seed account state (addresses = PII, insurance = PHI) for the
// seed customers, so /account has content on a fresh login. No DB, no RNG.
// Edits are held in-memory per session and reset on restart back to these
// seeds. Keyed by userId. Other users (e.g. fresh registrations) start blank.

export const seedAccounts: Record<string, AccountState> = {
  "user-customer-dana": {
    addresses: [
      {
        id: "addr-dana-home",
        label: "Home",
        fullName: "Dana Customer",
        street: "412 Birch Lane",
        city: "Portland",
        region: "OR",
        postalCode: "97201",
        country: "USA",
      },
    ],
    insurance: {
      provider: "BlueCross BlueShield",
      memberId: "BCBS-4471209",
      groupNumber: "GRP-88210",
    },
  },
  "user-customer-omar": {
    addresses: [
      {
        id: "addr-omar-home",
        label: "Home",
        fullName: "Omar Customer",
        street: "88 Cedar Court, Apt 3B",
        city: "Austin",
        region: "TX",
        postalCode: "73301",
        country: "USA",
      },
    ],
    insurance: {
      provider: "Aetna",
      memberId: "AET-9930112",
      groupNumber: "GRP-55014",
    },
  },
};

/** A blank account state (deep copy) for users without a seed. */
export function emptyAccountState(): AccountState {
  return {
    addresses: [],
    insurance: { provider: "", memberId: "", groupNumber: "" },
  };
}

/** Deep copy of the seed account state for a user, or a blank state. */
export function seedAccountFor(userId: string): AccountState {
  const seed = seedAccounts[userId];
  if (!seed) {
    return emptyAccountState();
  }
  return {
    addresses: seed.addresses.map((address) => ({ ...address })),
    insurance: { ...seed.insurance },
  };
}
