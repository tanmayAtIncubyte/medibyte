import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const SESSION_ID_COOKIE = "mb_session_id";

export function readSessionId(request: NextRequest): string | null {
  return request.cookies.get(SESSION_ID_COOKIE)?.value ?? null;
}

// Server-component reader: resolves the cart session id from the request cookie
// store. Returns null when the visitor has no cart session yet.
export async function readSessionIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_ID_COOKIE)?.value ?? null;
}

export function attachSessionId(response: NextResponse, sessionId: string): void {
  response.cookies.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function newSessionId(): string {
  return randomUUID();
}
