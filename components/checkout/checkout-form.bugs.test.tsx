import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutForm } from "./checkout-form";

// Toggle tests for the four checkout-form UI/UX bugs. The booleans are resolved
// on the checkout page (server) via isBugActive — covered by the gating engine
// tests — so here we drive the client form with the props directly and assert
// the observable behaviour. Default (no prop) is always the correct path.
//
//  - UI_NO_SUBMIT_FEEDBACK — submit shows no pending/disabled state.
//  - UI_FORM_CLEARS_ON_ERROR — a validation error wipes the entered fields.
//  - UX_VAGUE_ERROR — the error message is a generic "Something went wrong".
//  - UX_LOST_CHECKOUT_PROGRESS — a bfcache restore wipes the form.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function fillShipping() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Dana" } });
  fireEvent.change(screen.getByLabelText("Street address"), { target: { value: "1 Main" } });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
  fireEvent.change(screen.getByLabelText("State / region"), { target: { value: "OR" } });
  fireEvent.change(screen.getByLabelText("Postal code"), { target: { value: "97201" } });
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "USA" } });
}

function fillPayment() {
  fireEvent.change(screen.getByLabelText("Name on card"), { target: { value: "Dana C" } });
  fireEvent.change(screen.getByLabelText("Card number"), {
    target: { value: "4242424242424242" },
  });
  fireEvent.change(screen.getByLabelText("Expiry"), { target: { value: "12/30" } });
  fireEvent.change(screen.getByLabelText("CVC"), { target: { value: "123" } });
}

describe("UI_FORM_CLEARS_ON_ERROR + UX_VAGUE_ERROR toggles (validation error)", () => {
  it("flag off → a validation error keeps the entered fields and shows a specific message", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" />);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    // Submit with required shipping fields blank → client validation fails.
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByText(/Please fix the highlighted fields/i)).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toHaveValue("Portland"); // retained
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flag on (clears) → the entered fields are wiped on a validation error", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" clearFieldsOnError />);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByLabelText("City")).toHaveValue(""); // wiped
  });

  it("flag on (vague) → the error message is a generic 'Something went wrong'", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" vagueError />);
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.queryByText(/highlighted fields/i)).toBeNull();
  });
});

describe("UI_NO_SUBMIT_FEEDBACK toggle (pending state)", () => {
  it("flag off → the submit button shows a pending/disabled state while placing", async () => {
    // A fetch that never resolves keeps the form in the submitting state.
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CheckoutForm rxItems={[]} defaultFullName="" />);
    fillShipping();
    fillPayment();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Placing order…" })).toBeDisabled(),
    );
  });

  it("flag on → the submit button shows no pending feedback (stays enabled, label unchanged)", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CheckoutForm rxItems={[]} defaultFullName="" noSubmitFeedback />);
    fillShipping();
    fillPayment();
    const button = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Placing order…" })).toBeNull();
  });
});

describe("UX_LOST_CHECKOUT_PROGRESS toggle (bfcache restore)", () => {
  function firePageShow(persisted: boolean) {
    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: persisted });
    window.dispatchEvent(event);
  }

  it("flag off → a bfcache restore does NOT wipe the entered fields", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" />);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    firePageShow(true);
    expect(screen.getByLabelText("City")).toHaveValue("Portland");
  });

  it("flag on → a bfcache restore wipes the entered fields (lost progress)", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" loseProgressOnBack />);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    firePageShow(true);
    expect(screen.getByLabelText("City")).toHaveValue("");
  });

  it("flag on → a normal (non-persisted) pageshow does not wipe fields", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" loseProgressOnBack />);
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Portland" } });
    firePageShow(false);
    expect(screen.getByLabelText("City")).toHaveValue("Portland");
  });
});
