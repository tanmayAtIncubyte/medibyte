import { NextResponse } from "next/server";

import { extendCandidate, revokeCandidate } from "@/lib/access/candidates";
import { parseCandidateCode } from "@/lib/access/scope";
import { getAdminOrNull } from "@/lib/auth/guards";

// Per-candidate reviewer actions. Same genuine admin boundary as the
// collection route: every method re-checks the real guard.

const MIN_EXTRA_DAYS = 1;
const MAX_EXTRA_DAYS = 60;

type RouteContext = { params: Promise<{ code: string }> };

// Revoke: DEL the access key — the candidate is locked out on their next request.
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

  await revokeCandidate(code);
  return NextResponse.json({ ok: true });
}

// Extend: push expiresAt out by extraDays and re-set the TTL to match.
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
  const extraDays = body.extraDays;
  if (
    typeof extraDays !== "number" ||
    !Number.isInteger(extraDays) ||
    extraDays < MIN_EXTRA_DAYS ||
    extraDays > MAX_EXTRA_DAYS
  ) {
    return NextResponse.json(
      {
        error: `extraDays must be an integer between ${MIN_EXTRA_DAYS} and ${MAX_EXTRA_DAYS}`,
      },
      { status: 400 },
    );
  }

  const updated = await extendCandidate(code, extraDays);
  if (!updated) {
    return notFound();
  }
  return NextResponse.json({ candidate: { code, ...updated } });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "Unknown candidate" }, { status: 404 });
}
