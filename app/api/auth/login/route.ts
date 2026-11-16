import { NextResponse } from "next/server";

import { authenticate, type SessionUser } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/current-user";
import { candidateTrack, getCandidate } from "@/lib/access/candidates";
import { CANDIDATE_COOKIE, parseCandidateCode } from "@/lib/access/scope";

export async function POST(request: Request) {
  const { email, password } = await readCredentials(request);
  return loginWith(email, password, candidateCodeFromRequest(request));
}

// SEC_CREDS_IN_URL companion: when the bug is on, the client submits the login
// form as a GET with the credentials in the query string. This handler reads
// them from the URL so the buggy flow works end-to-end (credentials are then
// visible in the URL bar, browser history, server logs, and the Network tab).
// The default/clean flow uses POST with a JSON body and never hits this path.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const password = url.searchParams.get("password") ?? "";
  return loginWith(email, password, candidateCodeFromRequest(request));
}

async function loginWith(
  email: string,
  password: string,
  candidateCode: string | null,
): Promise<NextResponse> {
  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  // Track-binding: a candidate's access link constrains which account it may
  // sign into — a manual link → customer (dana/omar), an automation link →
  // Steve (qa_automation). The link is the source of truth, so someone holding
  // a manual link can never reach the clean-app (Steve) side and vice-versa.
  const mismatch = await trackBindingError(user, candidateCode);
  if (mismatch) {
    return NextResponse.json({ error: mismatch }, { status: 403 });
  }
  const response = NextResponse.json({ user }, { status: 200 });
  setSessionCookie(response, user);
  return response;
}

// Returns an error message when the signed-in account doesn't match the track of
// the candidate link in play, or null when it's fine. Admins are exempt (not
// candidates); with no link there's nothing to bind (the access gate governs
// entry separately).
async function trackBindingError(
  user: SessionUser,
  candidateCode: string | null,
): Promise<string | null> {
  if (user.role === "admin" || !candidateCode) {
    return null;
  }
  const record = await getCandidate(candidateCode);
  if (!record) {
    return null;
  }
  const track = candidateTrack(record);
  if (track === "automation" && user.role !== "qa_automation") {
    return "This access link is for the automation track — sign in with the automation (Steve) account from your brief.";
  }
  if (track === "manual" && user.role !== "customer") {
    return "This access link is for the manual track — sign in with the customer account from your brief.";
  }
  return null;
}

function candidateCodeFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const entry = header
    .split(/; */)
    .find((c) => c.startsWith(`${CANDIDATE_COOKIE}=`));
  if (!entry) {
    return null;
  }
  return parseCandidateCode(decodeURIComponent(entry.slice(CANDIDATE_COOKIE.length + 1)));
}

async function readCredentials(request: Request): Promise<{ email: string; password: string }> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}
