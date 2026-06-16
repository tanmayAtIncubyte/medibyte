import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";
import { brand } from "@/lib/brand";

// AC 2: The home page renders branded MediByte content (name/tagline/description)
// sourced from lib/brand.ts — not the framework default starter page.
describe("HomePage branded content", () => {
  it("renders the MediByte brand name from the brand source of truth", () => {
    render(<HomePage />);

    expect(screen.getAllByText(brand.name).length).toBeGreaterThan(0);
  });

  it("renders the brand tagline as the page heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: brand.tagline }),
    ).toBeInTheDocument();
  });

  it("renders the brand description", () => {
    render(<HomePage />);

    expect(screen.getByText(brand.description)).toBeInTheDocument();
  });

  it("does not render the Next.js default starter content", () => {
    render(<HomePage />);

    expect(
      screen.queryByText(/Get started by editing/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Deploy now/i)).not.toBeInTheDocument();
  });

  it("renders the refill reminder call to action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("button", { name: /set a refill reminder/i }),
    ).toBeInTheDocument();
  });
});
