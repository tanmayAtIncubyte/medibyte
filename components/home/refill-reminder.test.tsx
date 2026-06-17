import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RefillReminder } from "@/components/home/refill-reminder";

// AC 4: A shadcn/ui Button renders and is interactive — clicking it changes
// the component's observable state (label + confirmation message).
describe("RefillReminder interactivity", () => {
  it("starts with the prompt label and no confirmation message", () => {
    render(<RefillReminder />);

    expect(
      screen.getByRole("button", { name: "Set a refill reminder" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("switches the button label to the confirmed state when clicked", async () => {
    const user = userEvent.setup();
    render(<RefillReminder />);

    await user.click(
      screen.getByRole("button", { name: "Set a refill reminder" }),
    );

    expect(
      screen.getByRole("button", { name: "Reminder set" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Set a refill reminder" }),
    ).not.toBeInTheDocument();
  });

  it("reveals a confirmation message after the reminder is set", async () => {
    const user = userEvent.setup();
    render(<RefillReminder />);

    await user.click(
      screen.getByRole("button", { name: "Set a refill reminder" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /nudge you before your next refill/i,
    );
  });
});
