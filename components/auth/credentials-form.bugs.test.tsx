import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CredentialsForm } from "@/components/auth/credentials-form";

// Toggle tests for the two login transport/storage bugs. The booleans are
// resolved on the login page (server) via isBugActive — covered by the gating
// engine tests — so here we drive the client form with the props directly and
// assert the observable behaviour:
//   SEC_CREDS_IN_URL — credentials go in the URL query string on a GET (default
//                       OFF → POST body, no creds in the URL).
//   SEC_TOKEN_LOCALSTORAGE — identity is copied into localStorage on success
//                       (default OFF → nothing written client-side).

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

function okResponse(user: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ user }),
    clone() {
      return this;
    },
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(okResponse({ id: "u1", role: "customer" }));
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "dana@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "s3cret" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("SEC_CREDS_IN_URL toggle (login form)", () => {
  it("flag off → credentials go in the POST body, never the URL", async () => {
    render(<CredentialsForm mode="login" />);
    fillAndSubmit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(url).not.toContain("s3cret");
    expect(String(init.body)).toContain("s3cret");
  });

  it("flag on → credentials are placed in the GET query string", async () => {
    render(<CredentialsForm mode="login" credentialsInUrl />);
    fillAndSubmit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(url).toContain("/api/auth/login?");
    expect(url).toContain("password=s3cret");
    expect(url).toContain("email=dana%40example.test");
  });
});

describe("SEC_TOKEN_LOCALSTORAGE toggle (login form)", () => {
  it("flag off → nothing is written to localStorage on success", async () => {
    render(<CredentialsForm mode="login" />);
    fillAndSubmit();

    await waitFor(() => expect(pushMock).toHaveBeenCalled());
    expect(window.localStorage.getItem("mb_identity")).toBeNull();
  });

  it("flag on → the identity is copied into localStorage on success", async () => {
    render(<CredentialsForm mode="login" persistIdentityToLocalStorage />);
    fillAndSubmit();

    await waitFor(() =>
      expect(window.localStorage.getItem("mb_identity")).not.toBeNull(),
    );
    expect(window.localStorage.getItem("mb_identity")).toContain("customer");
  });
});
