import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Product } from "@/data/products";

import { ProductCatalog } from "./product-catalog";

const otc: Product = {
  id: "otc-1",
  name: "Ibuprofen 200mg",
  description: "Pain reliever and fever reducer.",
  price: 6.99,
  type: "OTC",
  category: "Pain Relief",
  stock: 100,
  requiresPrescription: false,
};

const rx: Product = {
  id: "rx-1",
  name: "Amoxicillin 500mg",
  description: "Antibiotic for bacterial infections.",
  price: 12.5,
  type: "Rx",
  category: "Antibiotics",
  stock: 40,
  requiresPrescription: true,
};

describe("ProductCatalog", () => {
  it("renders each product with name, price, and an OTC/Rx label", () => {
    render(<ProductCatalog products={[otc, rx]} />);

    expect(
      screen.getByRole("heading", { name: "Ibuprofen 200mg" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Amoxicillin 500mg" }),
    ).toBeInTheDocument();

    expect(screen.getByText("$6.99")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();

    expect(screen.getByText("Over the counter")).toBeInTheDocument();
    expect(screen.getByText("Prescription")).toBeInTheDocument();
  });

  it("shows an empty state when there are no products", () => {
    render(<ProductCatalog products={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /no products are available/i,
    );
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
