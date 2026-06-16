import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageContainer } from "@/components/layout/page-container";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { brand } from "@/lib/brand";

// AC 5: A shared app layout (header with MediByte branding + a page container)
// wraps page content, with a footer below. The root layout composes these three
// pieces around {children}; here we verify the chrome each piece contributes.
describe("SiteHeader", () => {
  it("renders a banner region", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders MediByte branding linking back to home", () => {
    render(<SiteHeader />);

    const home = screen.getByRole("link", { name: `${brand.name} home` });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders primary navigation actions", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });
});

describe("SiteFooter", () => {
  it("renders a contentinfo region with the brand name", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent(brand.name);
  });
});

describe("PageContainer", () => {
  it("wraps page content in a main landmark", () => {
    render(
      <PageContainer>
        <p>page body</p>
      </PageContainer>,
    );

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent("page body");
  });
});
