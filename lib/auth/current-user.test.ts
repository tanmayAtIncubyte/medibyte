import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/headers cookies() is server-runtime only; mock it so we can drive
// getCurrentUser from a controllable cookie jar under jsdom.
const cookieStore = { get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(cookieStore),
}));

import {
  SESSION_COOKIE,
  clearSessionCookie,
  getCurrentUser,
  setSessionCookie,
} from "@/lib/auth/current-user";
import { authenticate, type SessionUser } from "@/lib/auth/accounts";
import { getSessionSecret } from "@/lib/auth/secret";
import { signSession, type SessionPayload } from "@/lib/auth/session";

// Slice 4 — server-side resolution and emission of the session cookie.
// AC 4: a logged-in user's role is readable by server code for the session.
// AC 5: the cookie is httpOnly (not readable by client JS).
// AC 6: a tampered cookie resolves to no user (logged out, not impersonation).
// AC 7: logout clears the cookie.

const adminUser: SessionUser = authenticate("admin@medibyte.test", "admin1234")!;

function setCookieValue(value: string | undefined): void {
  cookieStore.get.mockReturnValue(value === undefined ? undefined : { value });
}

function validTokenFor(payload: SessionPayload): string {
  return signSession(payload, getSessionSecret());
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    setCookieValue(undefined);
  });

  it("returns null when no session cookie is present (logged out)", async () => {
    setCookieValue(undefined);

    expect(await getCurrentUser()).toBeNull();
  });

  it("resolves the user (with role) from a validly signed cookie", async () => {
    setCookieValue(
      validTokenFor({
        userId: adminUser.id,
        email: adminUser.email,
        role: "admin",
      }),
    );

    const user = await getCurrentUser();
    expect(user?.role).toBe("admin");
    expect(user?.email).toBe("admin@medibyte.test");
  });

  it("returns null when the cookie signature is tampered (treated as logged out)", async () => {
    const tampered = validTokenFor({
      userId: adminUser.id,
      email: adminUser.email,
      role: "admin",
    }).replace(/.$/, (c) => (c === "A" ? "B" : "A"));

    setCookieValue(tampered);

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null when a validly signed cookie names an account that does not exist", async () => {
    setCookieValue(
      validTokenFor({
        userId: "user-ghost",
        email: "ghost@example.test",
        role: "customer",
      }),
    );

    expect(await getCurrentUser()).toBeNull();
  });
});

describe("setSessionCookie", () => {
  it("writes a signed value under the session cookie name that round-trips back to the user", async () => {
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, adminUser);

    const written = response.cookies.get(SESSION_COOKIE)?.value;
    setCookieValue(written);
    expect((await getCurrentUser())?.id).toBe(adminUser.id);
  });

  it("marks the session cookie httpOnly so client JS cannot read it (AC 5)", () => {
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, adminUser);

    expect(response.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true);
  });

  it("scopes the session cookie to the whole site with lax same-site", () => {
    const response = NextResponse.json({ ok: true });

    setSessionCookie(response, adminUser);

    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.path).toBe("/");
    expect(cookie?.sameSite).toBe("lax");
  });
});

describe("clearSessionCookie", () => {
  it("expires the session cookie with maxAge 0 (AC 7 logout)", () => {
    const response = new NextResponse(null, { status: 204 });

    clearSessionCookie(response);

    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.value).toBe("");
  });
});
