// Pure, framework-free validation for the /register form. Mirrors the validator
// pattern used elsewhere (lib/orders/checkout.ts, lib/payments/payment.ts):
// returns a map of field-name -> message so the form can render inline,
// accessible errors and the route can gate the mutation. No framework imports.

export type RegistrationInput = {
  name?: string;
  email?: string;
  password?: string;
};

export type RegistrationErrors = Record<string, string>;

/** Minimum password length for a new account. */
export const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email shape check: non-empty local part, single @, a dot-separated
// domain with a 2+ char TLD, and no whitespace. Deliberately not RFC-exhaustive
// (RFC 5322 is overkill for an assessment app) but rejects the obvious junk
// ("notanemail", "a@b", "foo@bar", trailing/leading spaces).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** True when the string is a plausibly-valid email address. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Validates a registration submission. Required fields, a well-formed email,
 * and a password meeting the minimum length. Returns field -> message; an empty
 * object means the input is valid.
 */
export function validateRegistration(input: RegistrationInput): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (isBlank(input.name)) {
    errors.name = "Full name is required.";
  }

  if (isBlank(input.email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(input.email!)) {
    errors.email = "Enter a valid email address.";
  }

  const password = input.password ?? "";
  if (password.length === 0) {
    errors.password = "Password is required.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return errors;
}
