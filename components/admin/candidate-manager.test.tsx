import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidateManager } from "@/components/admin/candidate-manager";

// Phase 3 — the reviewer console for candidate access. Basic render + mint
// behaviour against a stubbed fetch (the real API is covered by its own route
// tests); follows the admin component test conventions.

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    json: async () => data,
  } as Response;
}

const liveCandidate = {
  code: "abc12345",
  name: "Priya Sharma",
  email: "priya@example.com",
  role: "Senior QA",
  createdAt: "2026-07-01T12:00:00.000Z",
  expiresAt: "2099-01-01T12:00:00.000Z",
  // no startedAt → "Not started"
};

const startedCandidate = {
  ...liveCandidate,
  code: "def67890",
  name: "Omar Reid",
  email: "omar@example.com",
  startedAt: "2026-07-02T09:30:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rendering", () => {
  it("shows the mint form and an empty state when no candidates exist", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [] }));

    render(<CandidateManager />);

    expect(screen.getByLabelText("Candidate name")).toBeInTheDocument();
    expect(screen.getByLabelText("Window (days)")).toHaveValue(10);
    expect(
      screen.getByRole("button", { name: "Create access link" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No active candidates/),
    ).toBeInTheDocument();
  });

  it("lists an active candidate with email, role, status, code, copy-link and actions", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [liveCandidate] }));

    render(<CandidateManager />);

    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getByText("priya@example.com")).toBeInTheDocument();
    expect(screen.getByText("Senior QA")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.getByText("abc12345")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy start link for abc12345" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Extend +10 days" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
  });

  it("shows a Started status once the candidate has begun", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [startedCandidate] }));

    render(<CandidateManager />);

    expect(await screen.findByText("Omar Reid")).toBeInTheDocument();
    expect(screen.getByText(/^Started/)).toBeInTheDocument();
  });
});

describe("minting", () => {
  it("requires a valid email before the submit button enables", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ candidates: [] }));

    render(<CandidateManager />);
    await screen.findByText(/No active candidates/);

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
      .mockResolvedValueOnce(jsonResponse({ candidate: liveCandidate }, 201))
      .mockResolvedValueOnce(jsonResponse({ candidates: [liveCandidate] }));

    render(<CandidateManager />);
    await screen.findByText(/No active candidates/);

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
});
