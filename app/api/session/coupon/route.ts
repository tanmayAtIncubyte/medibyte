import { type NextRequest, NextResponse } from "next/server";

import { sessionUserFromPayload } from "@/lib/auth/accounts";
import { SESSION_COOKIE } from "@/lib/auth/current-user";
import { getSessionSecret } from "@/lib/auth/secret";
import { verifySession } from "@/lib/auth/session";
import type { GatingUser } from "@/lib/bugs";
import { isBugActive } from "@/lib/bugs";
import { getCartView } from "@/lib/cart/cart-service";
import { validateCoupon } from "@/lib/coupons/coupon";
import {
  attachSessionId,
  newSessionId,
  readSessionId,
} from "@/lib/data/session-id";
import { clearCoupon, setCouponCode } from "@/lib/data/session-store";

// Reads the signed session user straight off the NextRequest cookie so bug-flag
// gating works in both the running app and unit tests. Read-only.
async function userFromRequest(request: NextRequest): Promise<GatingUser> {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(raw, getSessionSecret());
  if (!payload) {
    return null;
  }
  return sessionUserFromPayload(payload);
}

async function withSession(
  request: NextRequest,
  run: (sessionId: string) => Promise<{ status: number; body: unknown }>,
): Promise<NextResponse> {
  const existingSessionId = readSessionId(request);
  const sessionId = existingSessionId ?? newSessionId();
  const { status, body } = await run(sessionId);
  const response = NextResponse.json(body, { status });
  if (!existingSessionId) {
    attachSessionId(response, sessionId);
  }
  return response;
}

// Apply a coupon code to the session cart. Validates against the current cart
// subtotal; rejects unknown/expired/below-minimum codes with a clear message
// and applies no discount.
export async function POST(request: NextRequest) {
  const { code } = await request.json();
  // Resolve seeded-bug flags here (the signed user lives at this boundary) and
  // pass plain booleans into the pure validator; admins are never affected.
  const ignoreExpiry = isBugActive("FN_EXPIRED_COUPON_OK", await userFromRequest(request));
  return withSession(request, async (sessionId) => {
    const subtotal = (await getCartView(sessionId)).subtotal;
    const validation = validateCoupon(String(code ?? ""), subtotal, new Date(), {
      ignoreExpiry,
    });
    if (!validation.ok) {
      return {
        status: 422,
        body: { error: validation.message, reason: validation.reason },
      };
    }
    await setCouponCode(sessionId, validation.coupon.code);
    const cart = await getCartView(sessionId, { ignoreExpiry });
    return {
      status: 200,
      body: {
        appliedCoupon: cart.appliedCoupon,
        discount: cart.discount,
        total: cart.total,
      },
    };
  });
}

// Remove the applied coupon from the session.
export async function DELETE(request: NextRequest) {
  return withSession(request, async (sessionId) => {
    await clearCoupon(sessionId);
    return { status: 200, body: { appliedCoupon: null } };
  });
}
