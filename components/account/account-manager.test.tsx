import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  describe("delete / remove", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("offers Delete on an address and Remove on populated insurance", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /delete home address/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /remove insurance details/i }),
      ).toBeInTheDocument();
    });

    it("cancelling the confirm does NOT call the API", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      setup();
      await userEvent.click(screen.getByRole("button", { name: /delete home address/i }));
      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("confirming a delete PATCHes /api/account with the deleteAddress kind", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ account: { addresses: [], insurance } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      setup();
      await userEvent.click(screen.getByRole("button", { name: /delete home address/i }));
      expect(fetchSpy).toHaveBeenCalledOnce();
      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ kind: "deleteAddress", addressId: "addr-home" });
    });
  });
});
