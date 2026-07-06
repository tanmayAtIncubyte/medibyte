// Access gate (thin adapter). All DECISION logic is the pure, exhaustively
// tested gateDecision() in lib/access/gate.ts — this file only gathers inputs:
//
// - gate enabled  = Redis env present (the deployed assessment). Local dev,
//   demos and tests have no Redis env, so the gate passes everything.
// - admin         = HMAC-verified mb_session cookie whose signed role is
//   "admin" (node:crypto — hence the REQUIRED Node runtime below).
// - candidate     = mb_cand cookie whose `cand:<code>` access key still exists
//   in the KV. Native TTL is the timer; a DEL (revoke) locks out instantly.
//
// Locked-out pages redirect to /closed; locked-out API calls get 403 JSON.

import { NextResponse, type NextRequest } from "next/server";

import { gateDecision } from "@/lib/access/gate";
import { CANDIDATE_COOKIE, parseCandidateCode } from "@/lib/access/scope";
import { getSessionSecret } from "@/lib/auth/secret";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { backend } from "@/lib/data/backend";
import { hasRedisEnv } from "@/lib/data/backend-redis";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const gateEnabled = hasRedisEnv();
  if (!gateEnabled) {
    return NextResponse.next();
  }

  const session = verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    getSessionSecret(),
  );
  const isAdmin = session?.role === "admin";

  const candidateCode = parseCandidateCode(
    request.cookies.get(CANDIDATE_COOKIE)?.value,
  );
  const candidateExists =
    !isAdmin && candidateCode !== null
      ? (await backend().get(`cand:${candidateCode}`)) !== null
      : false;

  const decision = gateDecision({
    gateEnabled,
    isAdmin,
    candidateCode,
    candidateExists,
    pathname: request.nextUrl.pathname,
  });

  if (decision === "pass") {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Assessment window closed" },
      { status: 403 },
    );
  }
  return NextResponse.redirect(new URL("/closed", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  // Node runtime is REQUIRED: session verification uses node:crypto HMAC.
  runtime: "nodejs",
};
