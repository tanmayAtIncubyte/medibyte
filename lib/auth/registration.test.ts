import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  validateRegistration,
} from "@/lib/auth/registration";

// Baseline hardening (MED-22): the /register form must reject malformed emails
// and trivially weak passwords. These pin the CORRECT behaviour a Phase-4 toggle
// will later deliberately break.

describe("isValidEmail", () => {
  it.each([
    "dana@example.test",
    "a.b+tag@sub.domain.co",
    "user_name@host.io",
  ])("accepts a well-formed address (%s)", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "notanemail",
    "missing-at.example.com",
    "no-domain@",
    "@no-local.com",
    "two@@ats.com",
    "spaces in@email.com",
    "trailing@dot.",
    "short@tld.x",
  ])("rejects a malformed address (%s)", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("trims surrounding whitespace before checking", () => {
    expect(isValidEmail("  dana@example.test  ")).toBe(true);
  });
});

describe("validateRegistration", () => {
  const valid = {
    name: "Pat Buyer",
    email: "pat@example.test",
    password: "pw123456",
  };

  it("returns no errors for a fully valid submission", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("requires a name", () => {
    expect(validateRegistration({ ...valid, name: "   " })).toHaveProperty("name");
  });

  it("rejects a malformed email", () => {
    expect(validateRegistration({ ...valid, email: "notanemail" })).toMatchObject({
      email: "Enter a valid email address.",
    });
  });

  it("requires an email", () => {
    expect(validateRegistration({ ...valid, email: "" })).toMatchObject({
      email: "Email is required.",
    });
  });

  it("rejects a password shorter than the minimum", () => {
    const errors = validateRegistration({ ...valid, password: "x" });
    expect(errors.password).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("accepts a password exactly at the minimum length", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(validateRegistration({ ...valid, password })).toEqual({});
  });

  it("requires a password", () => {
    expect(validateRegistration({ ...valid, password: "" })).toMatchObject({
      password: "Password is required.",
    });
  });

  it("reports every invalid field at once", () => {
    const errors = validateRegistration({ name: "", email: "bad", password: "x" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "password"]);
  });
});
