import { type NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import {
  readAccountForApi,
  updateAddress,
  updateInsurance,
} from "@/lib/account/account-service";

// Inspectable account endpoint (hybrid policy: mutations go through /api/*).
// The owner is always resolved from the signed session cookie — the client
// never supplies a userId — so a customer can only read/edit their OWN account
// data (own-account-only access control; clean baseline). Insurance (PHI) and
// addresses (PII) travel in the request body only, never the URL/logs.

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  // SEC_PHI_OVERFETCH: resolved at the boundary (the user lives here). When on
  // for a non-admin, the response is padded with PHI the view never needs; clean
  // / admin gets only the rendered fields.
  const account = readAccountForApi(user.id, {
    overfetchPhi: isBugActive("SEC_PHI_OVERFETCH", user),
  });
  return NextResponse.json({ account });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json()) as
    | { kind: "address"; address: Record<string, string> }
    | { kind: "insurance"; insurance: Record<string, string> };

  const result =
    body.kind === "insurance"
      ? updateInsurance(user.id, body.insurance ?? {})
      : updateAddress(user.id, body.address ?? {});

  if (!result.ok) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", errors: result.errors },
      { status: 422 },
    );
  }

  return NextResponse.json({ account: result.state }, { status: 200 });
}
