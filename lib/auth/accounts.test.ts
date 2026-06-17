import { afterEach, describe, expect, it } from "vitest";

import {
  authenticate,
  registerCustomer,
  sessionUserFromPayload,
  toSessionPayload,
  DuplicateEmailError,
} from "@/lib/auth/accounts";
import { resetRegistrations } from "@/lib/data/registrations";

// Slice 4 — account logic over the seed users plus in-memory registrations.
// AC 1/2: valid seed credentials authenticate with the correct role.
// AC 3: unknown email or wrong password is rejected with no role leakage.
// AC 6: a session payload whose claims no longer match a live account is
//        rejected (a stale/forged claim cannot impersonate a user).
// AC 10: registration creates a customer-role account; duplicates are rejected.

// Registrations are an in-memory store; isolate every test.
afterEach(() => {
  resetRegistrations();
});

describe("authenticate", () => {
  it("returns an admin-role user for valid admin credentials", () => {
    const user = authenticate("admin@medibyte.test", "admin1234");

    expect(user?.role).toBe("admin");
    expect(user?.email).toBe("admin@medibyte.test");
  });

  it("returns a customer-role user for valid customer credentials", () => {
    const user = authenticate("dana@example.test", "dana1234");

    expect(user?.role).toBe("customer");
    expect(user?.id).toBe("user-customer-dana");
  });

  it("returns null for an unknown email", () => {
    expect(authenticate("nobody@example.test", "whatever")).toBeNull();
  });

  it("returns null for a known email with the wrong password", () => {
    expect(authenticate("admin@medibyte.test", "wrong-password")).toBeNull();
  });

  it("never exposes the password on the returned session user", () => {
    const user = authenticate("dana@example.test", "dana1234");

    expect(user).not.toHaveProperty("password");
  });

  it("authenticates a customer created via registration", () => {
    registerCustomer("New Person", "newperson@example.test", "secret123");

    const user = authenticate("newperson@example.test", "secret123");
    expect(user?.role).toBe("customer");
  });
});

describe("registerCustomer", () => {
  it("creates a customer-role account for a new email", () => {
    const user = registerCustomer("Pat Buyer", "pat@example.test", "pw123456");

    expect(user.role).toBe("customer");
    expect(user.name).toBe("Pat Buyer");
    expect(user.email).toBe("pat@example.test");
  });

  it("throws DuplicateEmailError when the email matches a seed account", () => {
    expect(() =>
      registerCustomer("Imposter", "admin@medibyte.test", "pw123456"),
    ).toThrow(DuplicateEmailError);
  });

  it("throws DuplicateEmailError when the email was already registered", () => {
    registerCustomer("First", "dup@example.test", "pw123456");

    expect(() =>
      registerCustomer("Second", "dup@example.test", "pw123456"),
    ).toThrow(DuplicateEmailError);
  });

  it("does not expose the password on the returned session user", () => {
    const user = registerCustomer("Pat Buyer", "pat2@example.test", "pw123456");

    expect(user).not.toHaveProperty("password");
  });
});

describe("sessionUserFromPayload (impersonation guard)", () => {
  it("resolves a live account from a payload that matches it", () => {
    const payload = toSessionPayload(
      authenticate("dana@example.test", "dana1234")!,
    );

    expect(sessionUserFromPayload(payload)?.id).toBe("user-customer-dana");
  });

  it("returns null when the payload role no longer matches the live account", () => {
    // A customer whose signed payload claims 'admin' must not be promoted.
    const escalated = {
      userId: "user-customer-dana",
      email: "dana@example.test",
      role: "admin" as const,
    };

    expect(sessionUserFromPayload(escalated)).toBeNull();
  });

  it("returns null when the payload id no longer matches the account at that email", () => {
    const mismatchedId = {
      userId: "user-some-other-id",
      email: "dana@example.test",
      role: "customer" as const,
    };

    expect(sessionUserFromPayload(mismatchedId)).toBeNull();
  });

  it("returns null when the account in the payload no longer exists", () => {
    const ghost = {
      userId: "user-deleted",
      email: "deleted@example.test",
      role: "customer" as const,
    };

    expect(sessionUserFromPayload(ghost)).toBeNull();
  });
});

describe("toSessionPayload", () => {
  it("carries only id, email, and role (never the name or password)", () => {
    const user = authenticate("admin@medibyte.test", "admin1234")!;

    expect(toSessionPayload(user)).toEqual({
      userId: "user-admin",
      email: "admin@medibyte.test",
      role: "admin",
    });
  });
});
