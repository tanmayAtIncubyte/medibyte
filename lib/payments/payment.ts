// Pure, framework-free validation for the mock payment fields.
//
// Card data is intentionally NEVER sent to the server (the store stores no card
// data), so payment is validated here and gated on the client before an order
// is placed. Returns a map of field-name -> message, keyed to match the checkout
// form input names (e.g. "mock.cardNumber") so the form renders inline errors.

export type PaymentInput = {
  cardName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
};

export type PaymentErrors = Record<string, string>;

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function validatePayment(input: PaymentInput, now: Date): PaymentErrors {
  const errors: PaymentErrors = {};

  if (isBlank(input.cardName)) {
    errors["mock.cardName"] = "Name on card is required.";
  }

  const digits = (input.cardNumber ?? "").replace(/[\s-]/g, "");
  if (isBlank(input.cardNumber)) {
    errors["mock.cardNumber"] = "Card number is required.";
  } else if (!/^\d{13,19}$/.test(digits)) {
    errors["mock.cardNumber"] = "Enter a valid card number (13–19 digits).";
  }

  const expiry = (input.expiry ?? "").trim();
  if (isBlank(input.expiry)) {
    errors["mock.expiry"] = "Expiry is required.";
  } else {
    const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(expiry);
    if (!match) {
      errors["mock.expiry"] = "Use MM/YY format.";
    } else {
      const month = Number(match[1]);
      const year = 2000 + Number(match[2]);
      if (month < 1 || month > 12) {
        errors["mock.expiry"] = "Enter a valid month (01–12).";
      } else {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors["mock.expiry"] = "This card has expired.";
        }
      }
    }
  }

  const cvc = (input.cvc ?? "").trim();
  if (isBlank(input.cvc)) {
    errors["mock.cvc"] = "CVC is required.";
  } else if (!/^\d{3,4}$/.test(cvc)) {
    errors["mock.cvc"] = "CVC must be 3 or 4 digits.";
  }

  return errors;
}
