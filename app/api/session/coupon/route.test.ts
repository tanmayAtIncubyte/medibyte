import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// This file tests the CLEAN coupon behavior, so pin every bug flag off
// in-memory (the committed data/bug-flags.json is the deploy profile and may
// enable bugs like FN_EXPIRED_COUPON_OK).
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => ({}),
}));

import { DELETE as couponDelete, POST as couponPost } from "@/app/api/session/coupon/route";
import { POST as cartPost } from "@/app/api/session/cart/route";
import { SESSION_ID_COOKIE } from "@/lib/data/session-id";
import { resetAllSessions } from "@/lib/data/session-store";

afterEach(async () => {
  await resetAllSessions();
});

function req(method: string, body: Record<string, unknown>, sessionId: string): NextRequest {
  return new NextRequest("http://localhost/api/session/coupon", {
    method,
    headers: {
      "content-type": "application/json",
      cookie: `${SESSION_ID_COOKIE}=${sessionId}`,
    },
    body: JSON.stringify(body),
  });
}

function addToCartReq(productId: string, quantity: number, sessionId: string): NextRequest {
  return new NextRequest("http://localhost/api/session/cart", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${SESSION_ID_COOKIE}=${sessionId}`,
    },
    body: JSON.stringify({ productId, quantity }),
  });
}

describe("POST /api/session/coupon", () => {
  it("applies a valid coupon and returns the discount", async () => {
    await cartPost(addToCartReq("prod-albuterol-inhaler", 2, "c-ok")); // 69.98

    const response = await couponPost(req("POST", { code: "save10" }, "c-ok"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.appliedCoupon.coupon.code).toBe("SAVE10");
    expect(body.discount).toBeGreaterThan(0);
  });

  it("rejects an expired coupon with 422 and a message", async () => {
    await cartPost(addToCartReq("prod-albuterol-inhaler", 1, "c-exp"));

    const response = await couponPost(req("POST", { code: "SPRING2023" }, "c-exp"));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.reason).toBe("expired");
    expect(body.error).toMatch(/expired/i);
  });

  it("rejects an unknown coupon with 422", async () => {
    await cartPost(addToCartReq("prod-albuterol-inhaler", 1, "c-unknown"));

    const response = await couponPost(req("POST", { code: "NOPE" }, "c-unknown"));

    expect(response.status).toBe(422);
    expect((await response.json()).reason).toBe("unknown");
  });
});

describe("DELETE /api/session/coupon", () => {
  it("removes an applied coupon", async () => {
    await cartPost(addToCartReq("prod-albuterol-inhaler", 2, "c-rm"));
    await couponPost(req("POST", { code: "SAVE10" }, "c-rm"));

    const response = await couponDelete(req("DELETE", {}, "c-rm"));

    expect(response.status).toBe(200);
    expect((await response.json()).appliedCoupon).toBeNull();
  });
});
