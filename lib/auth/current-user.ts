import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  sessionUserFromPayload,
  toSessionPayload,
  type SessionUser,
} from "@/lib/auth/accounts";
import { getSessionSecret } from "@/lib/auth/secret";
import { signSession, verifySession } from "@/lib/auth/session";

export const SESSION_COOKIE = "mb_session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

// Resolves the current user from the signed cookie for route handlers and
// server components. Returns null when there is no cookie, the signature does
// not verify (tampering), or the signed account no longer exists. Never throws.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = verifySession(rawCookie, getSessionSecret());
  if (!payload) {
    return null;
  }
  return sessionUserFromPayload(payload);
}

export function setSessionCookie(response: NextResponse, user: SessionUser): void {
  const value = signSession(toSessionPayload(user), getSessionSecret());
  response.cookies.set(SESSION_COOKIE, value, COOKIE_OPTIONS);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
