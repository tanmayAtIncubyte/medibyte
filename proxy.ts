// Access gate (thin adapter). All DECISION logic is the pure, exhaustively
// tested gateDecision() in lib/access/gate.ts — this file only gathers inputs:
//
// - gate enabled  = Redis env present (the deployed assessment). Local dev,
//   demos and tests have no Redis env, so the gate passes everything.
// - admin         = HMAC-verified mb_session cookie whose signed role is
//   "admin" (node:crypto — fine here: Next 16's proxy runs on the Node
//   runtime by default).
// - candidate     = mb_cand cookie whose roster entry is active AND unexpired
//   (candidateHasAccess). A revoked/expired candidate still EXISTS but is denied.
//
// Locked-out pages redirect to /closed; locked-out API calls get 403 JSON.

import { NextResponse, type NextRequest } from "next/server";

import { candidateHasAccess } from "@/lib/access/candidates";
import { gateDecision } from "@/lib/access/gate";
import { CANDIDATE_COOKIE, parseCandidateCode } from "@/lib/access/scope";
import { getSessionSecret } from "@/lib/auth/secret";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { hasRedisEnv } from "@/lib/data/backend-redis";

export async function proxy(request: NextRequest): Promise<NextResponse> {
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
  const candidateActive =
    !isAdmin && candidateCode !== null
      ? await candidateHasAccess(candidateCode)
      : false;

  const decision = gateDecision({
    gateEnabled,
    isAdmin,
    candidateCode,
    candidateActive,
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
};
