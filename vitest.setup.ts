import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

// next/link renders a real <a> in the browser; in jsdom we render a plain
// anchor so component tests can assert on href/text without the Next router.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement("a", { href, ...props }, children),
}));

afterEach(() => {
  cleanup();
});
