import { NextResponse } from "next/server";

import { listCandidates, mintCandidate } from "@/lib/access/candidates";
import { DEFAULT_CANDIDATE_WINDOW_DAYS } from "@/lib/access/scope";
import { getAdminOrNull } from "@/lib/auth/guards";

// Reviewer candidate-access API. This is a GENUINE access-control boundary
// (not a seeded bug): every method re-checks the real admin guard regardless
// of any page guard, same as the bug-image route.

const MAX_NAME_LENGTH = 80;
const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 60;

export async function GET(): Promise<NextResponse> {
  if (!(await getAdminOrNull())) {
    return forbidden();
  }
  return NextResponse.json({ candidates: await listCandidates() });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await getAdminOrNull())) {
    return forbidden();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return badRequest(`Name is required (max ${MAX_NAME_LENGTH} characters)`);
  }

  const windowDays =
    body.windowDays === undefined ? DEFAULT_CANDIDATE_WINDOW_DAYS : body.windowDays;
  if (
    typeof windowDays !== "number" ||
    !Number.isInteger(windowDays) ||
    windowDays < MIN_WINDOW_DAYS ||
    windowDays > MAX_WINDOW_DAYS
  ) {
    return badRequest(
      `windowDays must be an integer between ${MIN_WINDOW_DAYS} and ${MAX_WINDOW_DAYS}`,
    );
  }

  const candidate = await mintCandidate(name, windowDays);
  return NextResponse.json({ candidate }, { status: 201 });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
