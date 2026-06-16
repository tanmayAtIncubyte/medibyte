import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";
import { brand } from "@/lib/brand";
import { listFeaturedProducts } from "@/lib/data/products";

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

// MED-16: featured products are visible on the home page itself — a visitor no
// longer has to click "Browse" to see products. Reuses the catalog card UI.
describe("HomePage featured products", () => {
  it("renders a Featured products section heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /featured products/i }),
    ).toBeInTheDocument();
  });

  it("renders each featured product as a card linking to its detail page", () => {
    render(<HomePage />);

    const featured = listFeaturedProducts();
    expect(featured.length).toBeGreaterThan(0);

    for (const product of featured) {
      const link = screen.getByRole("link", {
        name: new RegExp(product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      });
      expect(link).toHaveAttribute("href", `/products/${product.id}`);
    }
  });

  it("links to the full catalog with a View all products link", () => {
    render(<HomePage />);

    const links = screen.getAllByRole("link", { name: /view all products/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/products");
    }
  });

  it("shows the featured rail directly on the home page (not behind a Browse click)", () => {
    render(<HomePage />);

    const section = screen
      .getByRole("heading", { name: /featured products/i })
      .closest("section");
    expect(section).not.toBeNull();
    // At least one product card link lives inside the featured section.
    const firstFeatured = listFeaturedProducts()[0];
    expect(
      within(section as HTMLElement).getByRole("link", {
        name: new RegExp(
          firstFeatured.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      }),
    ).toBeInTheDocument();
  });
});
