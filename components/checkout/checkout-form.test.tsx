import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckoutForm } from "./checkout-form";

// CheckoutForm uses the Next router for the post-success redirect; stub it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("CheckoutForm — prescription (PHI) step", () => {
  it("always shows shipping and a clearly-mock payment step", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="Dana Customer" />);

    expect(screen.getByRole("heading", { name: "Shipping address" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Dana Customer");
    expect(screen.getByRole("heading", { name: "Payment" })).toBeInTheDocument();
    expect(screen.getByText(/no real payment is processed/i)).toBeInTheDocument();
  });

  it("does NOT render the prescription step for an OTC-only cart", () => {
    render(<CheckoutForm rxItems={[]} defaultFullName="" />);
    expect(
      screen.queryByRole("heading", { name: "Prescription information" }),
    ).not.toBeInTheDocument();
  });

  it("renders a PHI fieldset per Rx item when the cart has Rx products", () => {
    render(
      <CheckoutForm
        rxItems={[
          { productId: "prod-lisinopril-10", productName: "Lisinopril 10mg Tablets (30 ct)" },
        ]}
        defaultFullName=""
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Prescription information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Lisinopril 10mg Tablets (30 ct)" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Patient name")).toBeInTheDocument();
    expect(screen.getByLabelText("Prescription number")).toBeInTheDocument();
  });
});
