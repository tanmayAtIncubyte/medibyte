import { NextResponse } from "next/server";

import { listCandidates, mintCandidate } from "@/lib/access/candidates";
import { DEFAULT_CANDIDATE_WINDOW_DAYS } from "@/lib/access/scope";
import { getAdminOrNull } from "@/lib/auth/guards";

// Reviewer candidate-access API. This is a GENUINE access-control boundary
// (not a seeded bug): every method re-checks the real admin guard regardless
// of any page guard, same as the bug-image route.

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_ROLE_LENGTH = 80;
const MAX_NOTES_LENGTH = 500;
const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 60;
// Deliberately lenient — reject the obvious non-emails, not RFC edge cases.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) {
    return badRequest("A valid email is required");
  }

  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (role.length > MAX_ROLE_LENGTH) {
    return badRequest(`Role must be at most ${MAX_ROLE_LENGTH} characters`);
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (notes.length > MAX_NOTES_LENGTH) {
    return badRequest(`Notes must be at most ${MAX_NOTES_LENGTH} characters`);
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

  const candidate = await mintCandidate({
    name,
    email,
    windowDays,
    role: role || undefined,
    notes: notes || undefined,
  });
  return NextResponse.json({ candidate }, { status: 201 });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
