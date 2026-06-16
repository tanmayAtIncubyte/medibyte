import { type NextRequest, NextResponse } from "next/server";

import { sessionUserFromPayload } from "@/lib/auth/accounts";
import { SESSION_COOKIE } from "@/lib/auth/current-user";
import { getSessionSecret } from "@/lib/auth/secret";
import { verifySession } from "@/lib/auth/session";
import type { GatingUser } from "@/lib/bugs";
import { isBugActive } from "@/lib/bugs";
import { findProductById } from "@/lib/data/products";
import { getAvailableStock } from "@/lib/data/stock-store";
import {
  addToCart,
  getCart,
  removeFromCart,
  setCartItemQuantity,
  setCartItemQuantityRaw,
} from "@/lib/data/session-store";
import {
  attachSessionId,
  newSessionId,
  readSessionId,
} from "@/lib/data/session-id";
import { stockStatus } from "@/lib/format";

// Reads the signed session user straight off the NextRequest cookie (rather than
// next/headers cookies()), so bug-flag gating in this mutation endpoint works in
// both the running app and unit tests. Read-only — does not change access
// control; the endpoint itself is intentionally session-scoped, not auth-gated.
function userFromRequest(request: NextRequest): GatingUser {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(raw, getSessionSecret());
  if (!payload) {
    return null;
  }
  return sessionUserFromPayload(payload);
}

function respondWithCart(
  request: NextRequest,
  status: number,
  produce: (sessionId: string) => unknown,
): NextResponse {
  const existingSessionId = readSessionId(request);
  const sessionId = existingSessionId ?? newSessionId();
  const body = produce(sessionId);
  const response = NextResponse.json(body, { status });
  if (!existingSessionId) {
    attachSessionId(response, sessionId);
  }
  return response;
}

export function GET(request: NextRequest) {
  return respondWithCart(request, 200, (sessionId) => ({
    items: getCart(sessionId),
  }));
}

export async function POST(request: NextRequest) {
  const { productId, quantity } = await request.json();
  const user = userFromRequest(request);

  // FN_OOS_ADDABLE: the correct (default) behaviour rejects adding an item with
  // no stock; the gated buggy path lets it through. Flag resolved at this
  // boundary (the signed user lives here) and never active for admin.
  const oosAddable = isBugActive("FN_OOS_ADDABLE", user);
  const product = findProductById(String(productId ?? ""));
  // Available stock = seed stock minus what's already reserved by placed orders,
  // so a product that has sold out (via the order flow) is no longer addable.
  if (
    !oosAddable &&
    product &&
    stockStatus(getAvailableStock(product.id)) === "out-of-stock"
  ) {
    return NextResponse.json(
      { error: "This item is out of stock." },
      { status: 409 },
    );
  }

  return respondWithCart(request, 201, (sessionId) => ({
    items: addToCart(sessionId, productId, Number(quantity) || 1),
  }));
}

// Set an item's quantity outright (used by the cart quantity stepper).
export async function PATCH(request: NextRequest) {
  const { productId, quantity } = await request.json();
  const user = userFromRequest(request);

  // FN_QTY_NONPOSITIVE: the correct (default) setter removes a line when the
  // quantity drops to 0 or below; the gated buggy path persists the raw
  // non-positive quantity instead. Flag resolved at this boundary; never admin.
  const qtyNonPositive = isBugActive("FN_QTY_NONPOSITIVE", user);
  return respondWithCart(request, 200, (sessionId) => ({
    items: qtyNonPositive
      ? setCartItemQuantityRaw(sessionId, productId, Number(quantity))
      : setCartItemQuantity(sessionId, productId, Number(quantity)),
  }));
}

// Remove a line item from the cart.
export async function DELETE(request: NextRequest) {
  const { productId } = await request.json();
  return respondWithCart(request, 200, (sessionId) => ({
    items: removeFromCart(sessionId, productId),
  }));
}
