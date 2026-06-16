import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { readSessionId } from "@/lib/data/session-id";
import type { CheckoutInput } from "@/lib/orders/checkout";
import { placeOrder } from "@/lib/orders/place-order";

// Inspectable checkout endpoint (hybrid policy: mutation goes through /api/*).
// Reads the signed session for the owner, the cart-session cookie for the cart,
// validates shipping (PII) + prescription (PHI), creates the order, and clears
// the cart. PHI lives only in the request body + server-side order store — it is
// never echoed into the URL/query string and is not logged here (clean
// baseline; the PHI-leak/IDOR bugs are Phase-4 toggles).
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const sessionId = readSessionId(request);
  if (!sessionId) {
    // No cart session means nothing to buy.
    return NextResponse.json({ error: "Your cart is empty." }, { status: 422 });
  }

  const body = (await request.json()) as Partial<CheckoutInput>;
  const input: CheckoutInput = {
    shipping: body.shipping ?? {},
    prescriptions: body.prescriptions ?? {},
  };

  // Resolve seeded-bug flags here (the user lives at this boundary) and pass
  // plain booleans into the pure order orchestration; admins are never affected.
  const result = placeOrder(sessionId, user, input, {
    bugs: {
      taxFloor: isBugActive("FN_TAX_FLOOR", user),
      ignoreExpiry: isBugActive("FN_EXPIRED_COUPON_OK", user),
      skipPostalValidation: isBugActive("FN_POSTAL_UNVALIDATED", user),
    },
  });
  if (!result.ok) {
    if (result.reason === "empty-cart") {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 422 });
    }
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", errors: result.errors },
      { status: 422 },
    );
  }

  // Return only the order id + a minimal confirmation summary. The full order
  // (incl. PHI) is fetched server-side on the order page with ownership checks.
  return NextResponse.json(
    {
      orderId: result.order.id,
      total: result.order.totals.total,
    },
    { status: 201 },
  );
}
