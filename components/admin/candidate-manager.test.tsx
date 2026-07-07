import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidateManager } from "@/components/admin/candidate-manager";

// Phase 3 — the reviewer console for candidate access. Basic render + mint
// behaviour against a stubbed fetch (the real API is covered by its own route
// tests); follows the admin component test conventions. Fixtures use the
// persistent-roster shape: a candidate carries an attempts[] history and a
// top-level status.

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => data,
  } as Response;
}

// Far-future expiry so displayStatus resolves to "active".
const FAR_FUTURE = "2099-01-01T12:00:00.000Z";

const activeCandidate = {
  code: "abc12345",
  name: "Priya Sharma",
  email: "priya@example.com",
  role: "Senior QA",
  createdAt: "2026-07-01T12:00:00.000Z",
  status: "active" as const,
  attempts: [
    {
      attempt: 1,
      grantedAt: "2026-07-01T12:00:00.000Z",
      windowDays: 10,
      expiresAt: FAR_FUTURE,
      // no startedAt → "Not started"
    },
  ],
};

const startedCandidate = {
  ...activeCandidate,
  code: "def67890",
  name: "Omar Reid",
  email: "omar@example.com",
  attempts: [
    {
      attempt: 1,
      grantedAt: "2026-07-01T12:00:00.000Z",
      windowDays: 10,
      expiresAt: FAR_FUTURE,
      startedAt: "2026-07-02T09:30:00.000Z",
    },
  ],
};

const revokedCandidate = {
  code: "ghi13579",
  name: "Lena Cho",
  email: "lena@example.com",
  role: "SDET",
  createdAt: "2026-07-01T12:00:00.000Z",
  status: "revoked" as const,
  attempts: [
    {
      attempt: 1,
      grantedAt: "2026-07-01T12:00:00.000Z",
      windowDays: 7,
      expiresAt: FAR_FUTURE,
      startedAt: "2026-07-01T13:00:00.000Z",
      revokedAt: "2026-07-03T10:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rendering", () => {
  it("shows the mint form with a fractional window and an empty state", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [] }));

    render(<CandidateManager />);

    expect(screen.getByLabelText("Candidate name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();

    const windowInput = screen.getByLabelText("Window (days)");
    expect(windowInput).toHaveValue(10);
    expect(windowInput).toHaveAttribute("step", "0.5");
    expect(windowInput).toHaveAttribute("min", "0.5");

    expect(
      screen.getByRole("button", { name: "Create access link" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/No candidates yet/)).toBeInTheDocument();
  });

  it("lists an active candidate with status, attempt, access-until and its actions", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [activeCandidate] }));

    render(<CandidateManager />);

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("priya@example.com")).toBeInTheDocument();
    expect(screen.getByText("Senior QA")).toBeInTheDocument();
    expect(screen.getByText("abc12345")).toBeInTheDocument();

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Attempt 1")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
    // "Access until" remaining label — far-future expiry never reads "expired".
    expect(screen.getByText(/left$/)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Copy start link for abc12345" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    // Active rows do not offer re-grant/remove.
    expect(
      screen.queryByRole("button", { name: "Re-grant" }),
    ).not.toBeInTheDocument();
  });

  it("shows a Started sub-line once the candidate has begun", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [startedCandidate] }));

    render(<CandidateManager />);

    expect(await screen.findByText("Omar Reid")).toBeInTheDocument();
    expect(screen.getByText(/^Started/)).toBeInTheDocument();
  });

  it("renders a revoked candidate with a Revoked badge and re-grant/remove actions", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [revokedCandidate] }));

    render(<CandidateManager />);

    expect(await screen.findByText("Lena Cho")).toBeInTheDocument();
    expect(screen.getByText("Revoked")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Re-grant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    // Revoked rows drop the active-only actions.
    expect(
      screen.queryByRole("button", { name: "Extend" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Revoke" }),
    ).not.toBeInTheDocument();
  });
});

describe("minting", () => {
  it("requires a valid email before the submit button enables", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [] }));

    render(<CandidateManager />);
    await screen.findByText(/No candidates yet/);

    const submit = screen.getByRole("button", { name: "Create access link" });
    expect(submit).toBeDisabled(); // nothing entered yet

    await userEvent.type(screen.getByLabelText("Candidate name"), "Priya Sharma");
    expect(submit).toBeDisabled(); // name only — email still missing

    await userEvent.type(screen.getByLabelText("Email"), "priya@example.com");
    expect(submit).toBeEnabled();
  });

  it("POSTs name, email and window, then refreshes the list", async () => {
    // Call order: initial GET (empty) → POST (mint) → refresh GET (one row).
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ candidates: [] }))
      .mockResolvedValueOnce(jsonResponse({ candidate: activeCandidate }, 201))
      .mockResolvedValueOnce(jsonResponse({ candidates: [activeCandidate] }));

    render(<CandidateManager />);
    await screen.findByText(/No candidates yet/);

    await userEvent.type(screen.getByLabelText("Candidate name"), "Priya Sharma");
    await userEvent.type(screen.getByLabelText("Email"), "priya@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create access link" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/candidates",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Priya Sharma",
          email: "priya@example.com",
          windowDays: 10,
        }),
      }),
    );
    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("abc12345")).toBeInTheDocument();
  });

  it("surfaces the server error text on a 409 duplicate email", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ candidates: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ error: "An active candidate already uses this email." }, 409),
      );

    render(<CandidateManager />);
    await screen.findByText(/No candidates yet/);

    await userEvent.type(screen.getByLabelText("Candidate name"), "Priya Sharma");
    await userEvent.type(screen.getByLabelText("Email"), "priya@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Create access link" }));

    expect(
      await screen.findByText("An active candidate already uses this email."),
    ).toBeInTheDocument();
  });
});
