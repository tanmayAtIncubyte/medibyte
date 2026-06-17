import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { InsuranceInfo, SavedAddress } from "@/lib/account/types";

import { AccountManager } from "./account-manager";

const address: SavedAddress = {
  id: "addr-home",
  label: "Home",
  fullName: "Dana Customer",
  street: "412 Birch Lane",
  city: "Portland",
  region: "OR",
  postalCode: "97201",
  country: "USA",
};

const insurance: InsuranceInfo = {
  provider: "BlueCross BlueShield",
  memberId: "BCBS-4471209",
  groupNumber: "GRP-88210",
};

function setup() {
  render(
    <AccountManager
      initialAddresses={[address]}
      initialInsurance={insurance}
      defaultFullName="Dana Customer"
    />,
  );
}

describe("AccountManager", () => {
  it("shows the saved address (PII) and insurance (PHI) read views", () => {
    setup();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText(/412 Birch Lane/)).toBeInTheDocument();
    expect(screen.getByText("BlueCross BlueShield")).toBeInTheDocument();
    expect(screen.getByText("BCBS-4471209")).toBeInTheDocument();
  });

  it("opens an editable insurance form with current values prefilled", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Provider")).toHaveValue("BlueCross BlueShield");
    expect(screen.getByLabelText("Member ID")).toHaveValue("BCBS-4471209");
  });

  it("opens an add-address form with required fields", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getByText("Add address")).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Street address")).toBeInTheDocument();
  });
});
