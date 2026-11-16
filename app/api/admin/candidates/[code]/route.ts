import { NextResponse } from "next/server";

import {
  extendCandidate,
  regrantCandidate,
  removeCandidate,
  revokeCandidate,
} from "@/lib/access/candidates";
import { parseCandidateCode } from "@/lib/access/scope";
import { getAdminOrNull } from "@/lib/auth/guards";

// Per-candidate reviewer actions. Same genuine admin boundary as the
// collection route: every method re-checks the real guard.

const MAX_DAYS = 60;

type RouteContext = { params: Promise<{ code: string }> };

// Revoke (soft): flip status to revoked, keeping the roster record + state so
// the candidate can be re-granted later.
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  if (!(await getAdminOrNull())) {
    return forbidden();
  }

  const code = parseCandidateCode((await params).code);
  if (!code) {
    return notFound();
  }

  const revoked = await revokeCandidate(code);
  if (!revoked) {
    return notFound();
  }
  return NextResponse.json({ candidate: revoked });
}

// Roster actions keyed by `action`: extend, regrant, remove.
export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  if (!(await getAdminOrNull())) {
    return forbidden();
  }

  const code = parseCandidateCode((await params).code);
  if (!code) {
    return notFound();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;

  if (action === "extend") {
    const extraDays = body.extraDays;
    if (!isValidDays(extraDays)) {
      return badRequest(`extraDays must be a number greater than 0 and at most ${MAX_DAYS}`);
    }
    const updated = await extendCandidate(code, extraDays);
    if (!updated) {
      return notFound();
    }
    return NextResponse.json({ candidate: updated });
  }

  if (action === "regrant") {
    const windowDays = body.windowDays;
    if (!isValidDays(windowDays)) {
      return badRequest(`windowDays must be a number greater than 0 and at most ${MAX_DAYS}`);
    }
    const updated = await regrantCandidate(code, windowDays);
    if (!updated) {
      return notFound();
    }
    return NextResponse.json({ candidate: updated });
  }

  if (action === "remove") {
    await removeCandidate(code);
    return NextResponse.json({ ok: true });
  }

  return badRequest("Unknown action — expected extend, regrant, or remove");
}

function isValidDays(value: unknown): value is number {
  return typeof value === "number" && value > 0 && value <= MAX_DAYS;
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "Unknown candidate" }, { status: 404 });
}
