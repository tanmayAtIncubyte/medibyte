import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogQuery } from "@/lib/catalog/query";

import { CatalogToolbar } from "./catalog-toolbar";

const query: CatalogQuery = {};
const categories = ["Pain Relief", "Antibiotics"];

describe("CatalogToolbar locator hardening", () => {
  it("exposes the search field via its accessible name with no id attribute", () => {
    render(<CatalogToolbar query={query} categories={categories} />);

    const search = screen.getByLabelText("Search products");
    expect(search).not.toHaveAttribute("id");
  });

  it("exposes the category field via its accessible name with no id attribute", () => {
    render(<CatalogToolbar query={query} categories={categories} />);

    const category = screen.getByRole("combobox", { name: "Category" });
    expect(category).not.toHaveAttribute("id");
  });

  it("exposes the type field via its accessible name with no id attribute", () => {
    render(<CatalogToolbar query={query} categories={categories} />);

    const type = screen.getByRole("combobox", { name: "Type" });
    expect(type).not.toHaveAttribute("id");
  });

  it("exposes the sort field via its accessible name with no id attribute", () => {
    render(<CatalogToolbar query={query} categories={categories} />);

    const sort = screen.getByRole("combobox", { name: "Sort by" });
    expect(sort).not.toHaveAttribute("id");
  });
});
