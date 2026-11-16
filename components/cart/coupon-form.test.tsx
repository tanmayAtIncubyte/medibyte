import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CouponForm } from "./coupon-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function errorResponse(message: string): Response {
  return {
    ok: false,
    status: 400,
    json: async () => ({ error: message }),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(errorResponse("That code isn't valid."));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("CouponForm locator hardening", () => {
  it("exposes the code input via its accessible name with no id attribute when the label is shown", () => {
    render(<CouponForm applied={null} />);

    const input = screen.getByLabelText("Coupon code");
    expect(input).not.toHaveAttribute("id");
  });

  it("links the error message to the input via a matching aria-describedby/id pair generated at render", async () => {
    render(<CouponForm applied={null} />);

    fireEvent.change(screen.getByLabelText("Coupon code"), {
      target: { value: "BADCODE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const errorMessage = await screen.findByRole("alert");
    const input = screen.getByLabelText("Coupon code");

    expect(input.getAttribute("aria-describedby")).toBe(errorMessage.getAttribute("id"));
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("has no accessible name from a label when noLabel is set (A11Y_INPUT_NO_LABEL)", () => {
    render(<CouponForm applied={null} noLabel />);

    expect(screen.queryByLabelText("Coupon code")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. SAVE10")).not.toHaveAccessibleName();
  });

  it("still links the error message to the input via id when noLabel is set", async () => {
    render(<CouponForm applied={null} noLabel />);

    fireEvent.change(screen.getByPlaceholderText("e.g. SAVE10"), {
      target: { value: "BADCODE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const errorMessage = await screen.findByRole("alert");
    const input = screen.getByPlaceholderText("e.g. SAVE10");

    expect(input.getAttribute("aria-describedby")).toBe(errorMessage.getAttribute("id"));
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
  });
});
