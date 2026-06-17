import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogPagination } from "./catalog-pagination";

// Toggle test for UX_NO_PAGE_TOTAL. The boolean is resolved on the products page
// (server) via isBugActive — covered by the gating engine tests — so here we
// drive the component with the prop directly and assert the observable
// behaviour. Default (no prop) shows the "Page X of Y" indicator.

vi.mock("next/link", () => ({
  default: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}));

afterEach(() => cleanup());

describe("UX_NO_PAGE_TOTAL toggle (catalog pagination)", () => {
  it("flag off → the 'Page X of Y' total indicator is shown", () => {
    render(<CatalogPagination query={{}} page={2} totalPages={5} />);
    expect(screen.getByText(/Page 2 of 5/i)).toBeInTheDocument();
  });

  it("flag on → no total-pages indicator is rendered", () => {
    render(<CatalogPagination query={{}} page={2} totalPages={5} hidePageTotal />);
    expect(screen.queryByText(/Page 2 of 5/i)).toBeNull();
    // The page links themselves still render (only the total is hidden).
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
  });
});
