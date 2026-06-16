import { describe, expect, it } from "vitest";

import { validatePayment } from "./payment";

// Fixed "now" for deterministic expiry checks.
const NOW = new Date("2026-06-16T00:00:00Z");

const VALID = {
  cardName: "Dana Customer",
  cardNumber: "4242 4242 4242 4242",
  expiry: "08/27",
  cvc: "123",
};

describe("validatePayment", () => {
  it("accepts a well-formed card", () => {
    expect(validatePayment(VALID, NOW)).toEqual({});
  });

  it("flags every field when the form is empty", () => {
    const errors = validatePayment({}, NOW);
    expect(errors["mock.cardName"]).toBeTruthy();
    expect(errors["mock.cardNumber"]).toBeTruthy();
    expect(errors["mock.expiry"]).toBeTruthy();
    expect(errors["mock.cvc"]).toBeTruthy();
  });

  it("rejects a non-numeric / too-short card number", () => {
    expect(validatePayment({ ...VALID, cardNumber: "abc" }, NOW)["mock.cardNumber"]).toBeTruthy();
    expect(validatePayment({ ...VALID, cardNumber: "4242" }, NOW)["mock.cardNumber"]).toBeTruthy();
  });

  it("accepts card numbers with spaces or dashes", () => {
    expect(validatePayment({ ...VALID, cardNumber: "4000-0000-0000-0002" }, NOW)["mock.cardNumber"]).toBeUndefined();
  });

  it("rejects a malformed expiry", () => {
    expect(validatePayment({ ...VALID, expiry: "13/99" }, NOW)["mock.expiry"]).toBeTruthy(); // bad month
    expect(validatePayment({ ...VALID, expiry: "2027" }, NOW)["mock.expiry"]).toBeTruthy(); // wrong format
  });

  it("rejects an expired card and accepts the current month", () => {
    expect(validatePayment({ ...VALID, expiry: "05/26" }, NOW)["mock.expiry"]).toBeTruthy(); // last month
    expect(validatePayment({ ...VALID, expiry: "01/20" }, NOW)["mock.expiry"]).toBeTruthy(); // years ago
    expect(validatePayment({ ...VALID, expiry: "06/26" }, NOW)["mock.expiry"]).toBeUndefined(); // this month
  });

  it("rejects a CVC that is not 3–4 digits", () => {
    expect(validatePayment({ ...VALID, cvc: "x" }, NOW)["mock.cvc"]).toBeTruthy();
    expect(validatePayment({ ...VALID, cvc: "12" }, NOW)["mock.cvc"]).toBeTruthy();
    expect(validatePayment({ ...VALID, cvc: "12345" }, NOW)["mock.cvc"]).toBeTruthy();
    expect(validatePayment({ ...VALID, cvc: "1234" }, NOW)["mock.cvc"]).toBeUndefined();
  });
});
