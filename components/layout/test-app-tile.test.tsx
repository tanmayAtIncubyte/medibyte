import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// The tile reads usePathname() and resets its dismissed state whenever the
// path changes. Mock it with a mutable value so we can simulate navigation.
let pathname = "/products";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

import { TestAppTile } from "@/components/layout/test-app-tile";

const LABEL = "Test app — not a real pharmacy";

afterEach(() => {
  pathname = "/products";
});

describe("TestAppTile", () => {
  it("renders the test-app marker on load", () => {
    render(<TestAppTile />);
    expect(screen.getByText(LABEL)).toBeInTheDocument();
  });

  it("hides when dismissed", async () => {
    render(<TestAppTile />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
  });

  it("reappears on navigation (dismissal is not persisted)", async () => {
    const { rerender } = render(<TestAppTile />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();

    // Simulate a route change → usePathname returns a new value.
    pathname = "/cart";
    rerender(<TestAppTile />);

    expect(screen.getByText(LABEL)).toBeInTheDocument();
  });
});
