import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const { email, password } = await readCredentials(request);
  return loginWith(email, password);
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
  return loginWith(email, password);
}

function loginWith(email: string, password: string): NextResponse {
  const user = authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const response = NextResponse.json({ user }, { status: 200 });
  setSessionCookie(response, user);
  return response;
}

async function readCredentials(request: Request): Promise<{ email: string; password: string }> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}
