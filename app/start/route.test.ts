import { describe, expect, it } from "vitest";

import { GET } from "@/app/start/route";
import { getCandidate, mintCandidate, revokeCandidate } from "@/lib/access/candidates";
import { CANDIDATE_COOKIE } from "@/lib/access/scope";

// Phase 3 — /start?code=… is the candidate's single entry point. A LIVE code
// sets the mb_cand cookie and hands off to /login; anything else (missing,
// malformed, unknown, revoked/expired) lands on /closed with NO cookie.

function startRequest(query: string): Request {
  return new Request(`http://localhost:4321/start${query}`);
}

describe("/start with a live code", () => {
  it("sets the mb_cand cookie and redirects to /login", async () => {
    const minted = await mintCandidate({ name: "Live Candidate", email: "live@example.com" });

    const response = await GET(startRequest(`?code=${minted.code}`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:4321/login");
    const cookie = response.cookies.get(CANDIDATE_COOKIE);
    expect(cookie?.value).toBe(minted.code);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    // maxAge tracks the remaining access window (default 10 days here).
    expect(cookie?.maxAge).toBeGreaterThan(0);
    expect(cookie?.maxAge).toBeLessThanOrEqual(10 * 86_400);
  });

  it("stamps startedAt on first open and leaves it unchanged on a second open", async () => {
    const minted = await mintCandidate({ name: "Starter", email: "starter@example.com" });

    await GET(startRequest(`?code=${minted.code}`));
    const first = (await getCandidate(minted.code))?.startedAt;
    expect(first).toBeTruthy();

    await GET(startRequest(`?code=${minted.code}`));
    const second = (await getCandidate(minted.code))?.startedAt;
    expect(second).toBe(first); // first-open wins
  });
});

describe("/start without live access", () => {
  it("redirects a revoked (dead) code to /closed without setting a cookie", async () => {
    const minted = await mintCandidate({ name: "Revoked Candidate", email: "rev@example.com" });
    await revokeCandidate(minted.code);

    const response = await GET(startRequest(`?code=${minted.code}`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:4321/closed");
    expect(response.cookies.get(CANDIDATE_COOKIE)).toBeUndefined();
  });

  it("redirects an unknown code to /closed", async () => {
    const response = await GET(startRequest("?code=deadbeef"));

    expect(response.headers.get("location")).toBe("http://localhost:4321/closed");
  });

  it("redirects a malformed code to /closed", async () => {
    const response = await GET(startRequest("?code=NOT%20A%20CODE!!"));

    expect(response.headers.get("location")).toBe("http://localhost:4321/closed");
  });

  it("redirects a missing code to /closed", async () => {
    const response = await GET(startRequest(""));

    expect(response.headers.get("location")).toBe("http://localhost:4321/closed");
  });
});
