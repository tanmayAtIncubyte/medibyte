import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const { email, password } = await readCredentials(request);
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
