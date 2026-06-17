import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

// AC 6: An unknown route shows a styled 404 page (not an unstyled crash),
// with a clear message and a back-to-home action.
describe("NotFound page", () => {
  it("identifies itself as a 404 error", () => {
    render(<NotFound />);

    expect(screen.getByText(/error 404/i)).toBeInTheDocument();
  });

  it("renders a not-found heading", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: /couldn't find that page/i }),
    ).toBeInTheDocument();
  });

  it("offers a back-to-home action pointing at the root route", () => {
    render(<NotFound />);

    const backHome = screen.getByRole("link", { name: /back to home/i });
    expect(backHome).toHaveAttribute("href", "/");
  });
});
