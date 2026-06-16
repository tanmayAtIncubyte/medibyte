import { type NextRequest, NextResponse } from "next/server";

import { getCartView } from "@/lib/cart/cart-service";
import { validateCoupon } from "@/lib/coupons/coupon";
import {
  attachSessionId,
  newSessionId,
  readSessionId,
} from "@/lib/data/session-id";
import { clearCoupon, setCouponCode } from "@/lib/data/session-store";

function withSession(
  request: NextRequest,
  run: (sessionId: string) => { status: number; body: unknown },
): NextResponse {
  const existingSessionId = readSessionId(request);
  const sessionId = existingSessionId ?? newSessionId();
  const { status, body } = run(sessionId);
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
  return withSession(request, (sessionId) => {
    const subtotal = getCartView(sessionId).subtotal;
    const validation = validateCoupon(String(code ?? ""), subtotal);
    if (!validation.ok) {
      return {
        status: 422,
        body: { error: validation.message, reason: validation.reason },
      };
    }
    setCouponCode(sessionId, validation.coupon.code);
    const cart = getCartView(sessionId);
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
  return withSession(request, (sessionId) => {
    clearCoupon(sessionId);
    return { status: 200, body: { appliedCoupon: null } };
  });
}
