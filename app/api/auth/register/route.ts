import { NextResponse } from "next/server";

import { DuplicateEmailError, registerCustomer } from "@/lib/auth/accounts";
import { setSessionCookie } from "@/lib/auth/current-user";

export async function POST(request: Request) {
  const { name, email, password } = await readRegistration(request);
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  try {
    const user = registerCustomer(name, email, password);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, user);
    return response;
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
    }
    throw error;
  }
}

async function readRegistration(
  request: Request,
): Promise<{ name: string; email: string; password: string }> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}
