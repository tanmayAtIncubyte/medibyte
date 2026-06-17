import { describe, expect, it } from "vitest";

import type { BugFlags } from "@/lib/bug-flags";
import { isBugActiveWith } from "@/lib/bugs";
import { readAccountForApi } from "@/lib/account/account-service";

// SEC_PHI_OVERFETCH toggle test. The /api/account GET resolves the flag and
// passes `overfetchPhi` in; here we drive the pure service helper via
// isBugActiveWith so the full contract is covered:
//   flag off → only the fields the account view renders,
//   flag on  → a customer's payload is padded with PHI the view never needs;
//              an admin's payload is always lean (flag inert for admins).

const CUSTOMER = { id: "user-customer-dana", role: "customer" as const };
const ADMIN = { id: "user-admin", role: "admin" as const };

// The three insurance fields the view actually renders.
const RENDERED_INSURANCE_KEYS = ["provider", "memberId", "groupNumber"];
// PHI fields the view never renders — present only when the bug leaks them.
const LEAKED_KEYS = ["subscriberSsn", "dateOfBirth", "diagnosisCodes", "medicationHistory"];

function flags(set: Partial<Record<string, boolean>>): BugFlags {
  return set as BugFlags;
}

function read(
  flagsValue: BugFlags,
  user: { id: string; role: "admin" | "customer" },
) {
  return readAccountForApi(user.id, {
    overfetchPhi: isBugActiveWith(flagsValue, "SEC_PHI_OVERFETCH", user),
  });
}

describe("SEC_PHI_OVERFETCH toggle", () => {
  it("flag off → only the rendered fields, no leaked PHI, for everyone", () => {
    const off = flags({ SEC_PHI_OVERFETCH: false });
    for (const user of [CUSTOMER, ADMIN]) {
      const payload = read(off, user);
      const insuranceKeys = Object.keys(payload.insurance);
      expect(insuranceKeys.sort()).toEqual([...RENDERED_INSURANCE_KEYS].sort());
      for (const leaked of LEAKED_KEYS) {
        expect(insuranceKeys).not.toContain(leaked);
      }
    }
  });

  it("flag on → a customer's payload leaks PHI; admin's stays lean", () => {
    const on = flags({ SEC_PHI_OVERFETCH: true });

    const customerPayload = read(on, CUSTOMER);
    const customerKeys = Object.keys(customerPayload.insurance);
    for (const leaked of LEAKED_KEYS) {
      expect(customerKeys).toContain(leaked);
    }

    const adminPayload = read(on, ADMIN);
    const adminKeys = Object.keys(adminPayload.insurance);
    for (const leaked of LEAKED_KEYS) {
      expect(adminKeys).not.toContain(leaked); // flag inert for admins
    }
  });
});
