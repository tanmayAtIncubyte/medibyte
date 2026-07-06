import type { NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as register } from "@/app/api/auth/register/route";
import { SESSION_COOKIE } from "@/lib/auth/current-user";
import { getSessionSecret } from "@/lib/auth/secret";
import { verifySession } from "@/lib/auth/session";
import { resetRegistrations } from "@/lib/data/registrations";

// Slice 4 — auth endpoints over real HTTP (route handlers set/clear the cookie
// on the response directly, so no next/headers runtime is needed here).
// AC 1/2: login with valid creds starts a session of the right role.
// AC 3: bad creds return 401 with no session cookie.
// AC 5/6: the issued cookie is a verifiable signed token.
// AC 7: logout clears the cookie.
// AC 10: register creates a customer session; duplicate email returns 409.

afterEach(async () => {
  await resetRegistrations();
});

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sessionCookie(response: NextResponse) {
  return response.cookies.get(SESSION_COOKIE);
}

describe("POST /api/auth/login", () => {
  it("returns 200 and a verifiable admin session cookie for valid admin creds", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "admin@medibyte.test",
        password: "admin1234",
      }),
    );

    expect(response.status).toBe(200);
    const token = sessionCookie(response)?.value;
    expect(verifySession(token, getSessionSecret())?.role).toBe("admin");
  });

  it("starts a customer session for valid customer creds", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "dana@example.test",
        password: "dana1234",
      }),
    );

    const token = sessionCookie(response)?.value;
    expect(verifySession(token, getSessionSecret())?.role).toBe("customer");
  });

  it("returns 401 and sets no session cookie for a wrong password (AC 3)", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "admin@medibyte.test",
        password: "nope",
      }),
    );

    expect(response.status).toBe(401);
    expect(sessionCookie(response)).toBeUndefined();
  });

  it("returns 401 for an unknown email", async () => {
    const response = await login(
      jsonRequest("http://localhost/api/auth/login", {
        email: "ghost@example.test",
        password: "whatever",
      }),
    );

    expect(response.status).toBe(401);
    expect(sessionCookie(response)).toBeUndefined();
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 204 and clears the session cookie (AC 7)", async () => {
    const response = await logout();

    expect(response.status).toBe(204);
    const cookie = sessionCookie(response);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});

describe("POST /api/auth/register", () => {
  it("returns 201 and starts a customer session for a new email (AC 10)", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        name: "New Buyer",
        email: "newbuyer@example.test",
        password: "pw123456",
      }),
    );

    expect(response.status).toBe(201);
    const token = sessionCookie(response)?.value;
    expect(verifySession(token, getSessionSecret())?.role).toBe("customer");
  });

  it("returns 409 and no session for a duplicate email (AC 10)", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Imposter",
        email: "admin@medibyte.test",
        password: "pw123456",
      }),
    );

    expect(response.status).toBe(409);
    expect(sessionCookie(response)).toBeUndefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", { email: "x@example.test" }),
    );

    expect(response.status).toBe(400);
    expect(sessionCookie(response)).toBeUndefined();
  });

  it("returns 400 with field errors and no session for a malformed email", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Bad Email",
        email: "notanemail",
        password: "pw123456",
      }),
    );

    expect(response.status).toBe(400);
    expect(sessionCookie(response)).toBeUndefined();
    const body = (await response.json()) as { errors?: Record<string, string> };
    expect(body.errors?.email).toBeDefined();
  });

  it("returns 400 with field errors and no session for a too-short password", async () => {
    const response = await register(
      jsonRequest("http://localhost/api/auth/register", {
        name: "Weak Password",
        email: "weak@example.test",
        password: "x",
      }),
    );

    expect(response.status).toBe(400);
    expect(sessionCookie(response)).toBeUndefined();
    const body = (await response.json()) as { errors?: Record<string, string> };
    expect(body.errors?.password).toBeDefined();
  });
});
