import { NextResponse } from "next/server";

import { getCandidate, markStarted } from "@/lib/access/candidates";
import { CANDIDATE_COOKIE, parseCandidateCode } from "@/lib/access/scope";

// The candidate's single entry point: /start?code=<minted code>. A LIVE code
// sets the mb_cand cookie (scoping all their state under cand:<code> and
// letting the middleware gate them) and hands off to /login. A dead, revoked,
// malformed or missing code lands on /closed. The cookie's maxAge tracks the
// access window so the browser drops it in step with the KV key's TTL.
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = parseCandidateCode(url.searchParams.get("code") ?? undefined);
  if (!code) {
    return NextResponse.redirect(new URL("/closed", request.url));
  }

  const access = await getCandidate(code);
  if (!access) {
    return NextResponse.redirect(new URL("/closed", request.url));
  }

  // Stamp the assignment start on the first open (no-op on later opens).
  await markStarted(code);

  const maxAge = Math.max(
    0,
    Math.floor((Date.parse(access.expiresAt) - Date.now()) / 1000),
  );
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(CANDIDATE_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  });
  return response;
}
