import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET as cartGet, POST as cartPost } from "@/app/api/session/cart/route";
import { SESSION_ID_COOKIE } from "@/lib/data/session-id";
import { resetAllSessions } from "@/lib/data/session-store";

// Slice 2 — session cart endpoint over real HTTP.
// AC 6: a write performed in a session is readable back within the same session.
// Also covers session-id issuance and isolation between sessions.

afterEach(() => {
  resetAllSessions();
});

function getRequest(sessionId?: string): NextRequest {
  const headers = sessionId
    ? { cookie: `${SESSION_ID_COOKIE}=${sessionId}` }
    : undefined;
  return new NextRequest("http://localhost/api/session/cart", { headers });
}

function postRequest(
  body: { productId: string; quantity?: number },
  sessionId?: string,
): NextRequest {
  return new NextRequest("http://localhost/api/session/cart", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionId ? { cookie: `${SESSION_ID_COOKIE}=${sessionId}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("GET /api/session/cart", () => {
  it("responds 200 with an empty cart for a brand-new session", async () => {
    const response = cartGet(getRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toEqual([]);
  });

  it("issues a session id cookie when the request has none", () => {
    const response = cartGet(getRequest());

    expect(response.cookies.get(SESSION_ID_COOKIE)?.value).toBeTruthy();
  });

  it("does not reissue a session id cookie when one is already present", () => {
    const response = cartGet(getRequest("existing-session"));

    expect(response.cookies.get(SESSION_ID_COOKIE)).toBeUndefined();
  });
});

describe("POST /api/session/cart", () => {
  it("responds 201 with the written item", async () => {
    const response = await cartPost(
      postRequest({ productId: "prod-ibuprofen-200", quantity: 2 }, "sess-1"),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.items).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 2 },
    ]);
  });

  it("defaults to a quantity of 1 when none is supplied", async () => {
    const response = await cartPost(
      postRequest({ productId: "prod-vitamin-d3" }, "sess-default"),
    );

    const body = await response.json();
    expect(body.items).toEqual([{ productId: "prod-vitamin-d3", quantity: 1 }]);
  });
});

// AC 6: write-then-read within the same session over HTTP.
describe("session cart write/read roundtrip", () => {
  it("reads back a posted item using the same session cookie", async () => {
    await cartPost(
      postRequest({ productId: "prod-ibuprofen-200", quantity: 3 }, "sess-rt"),
    );

    const body = await cartGet(getRequest("sess-rt")).json();
    expect(body.items).toEqual([
      { productId: "prod-ibuprofen-200", quantity: 3 },
    ]);
  });

  it("isolates carts across different session cookies", async () => {
    await cartPost(
      postRequest({ productId: "prod-ibuprofen-200", quantity: 1 }, "sess-x"),
    );

    const body = await cartGet(getRequest("sess-y")).json();
    expect(body.items).toEqual([]);
  });
});
