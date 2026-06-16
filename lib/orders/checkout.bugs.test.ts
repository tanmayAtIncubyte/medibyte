import { describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { validateShipping } from "@/lib/orders/checkout";

// Toggle test for FN_POSTAL_UNVALIDATED. validateShipping is pure (takes a
// skipPostalValidation boolean). With a blank postal code, the correct path
// flags it required; the buggy path lets it through.

const CUSTOMER = { role: "customer" } as const;
const ADMIN = { role: "admin" } as const;

const blankPostal = {
  fullName: "Dana Doe",
  street: "1 Main St",
  city: "Springfield",
  region: "IL",
  postalCode: "",
  country: "USA",
};

const ON: BugFlags = { FN_POSTAL_UNVALIDATED: true };
const OFF: BugFlags = { FN_POSTAL_UNVALIDATED: false };

function postalError(flags: BugFlags, user: { role: "admin" | "customer" } | null) {
  const errors = validateShipping(blankPostal, {
    skipPostalValidation: isBugActiveWith(flags, "FN_POSTAL_UNVALIDATED", user),
  });
  return errors["shipping.postalCode"];
}

describe("FN_POSTAL_UNVALIDATED toggle", () => {
  it("flag off → blank postal code is required for everyone", () => {
    expect(postalError(OFF, CUSTOMER)).toBe("Postal code is required.");
    expect(postalError(OFF, ADMIN)).toBe("Postal code is required.");
  });

  it("flag on → blank postal code passes for a customer, still required for an admin", () => {
    expect(postalError(ON, CUSTOMER)).toBeUndefined();
    expect(postalError(ON, ADMIN)).toBe("Postal code is required.");
  });
});
