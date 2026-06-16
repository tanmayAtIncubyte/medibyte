import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { findBugByKey } from "@/lib/bug-registry";
import {
  loadBugFlags,
  resetBugFlags,
  setBugFlag,
  type BugFlags,
} from "@/lib/bug-flags";

// Admin-only by default. SEC_MISSING_ADMIN_AUTH: when on for a non-admin, the
// guard is dropped so a customer (or logged-out visitor) can read/toggle flags.
// Resolved here at the route boundary; because isBugActive is always false for
// an admin, an admin's access is unchanged and the admin panel never breaks.
async function adminGuardPasses(): Promise<boolean> {
  const user = await getCurrentUser();
  if (user?.role === "admin") {
    return true;
  }
  return isBugActive("SEC_MISSING_ADMIN_AUTH", user ?? null);
}

export async function GET() {
  if (!(await adminGuardPasses())) {
    return forbidden();
  }
  return NextResponse.json(loadBugFlags(), { status: 200 });
}

export async function POST(request: Request) {
  if (!(await adminGuardPasses())) {
    return forbidden();
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return applyAction(body);
}

function applyAction(body: Record<string, unknown>): NextResponse {
  if (body.reset === true) {
    return ok(resetBugFlags());
  }
  if (typeof body.key === "string" && typeof body.enabled === "boolean") {
    return toggleFlag(body.key, body.enabled);
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

function toggleFlag(key: string, enabled: boolean): NextResponse {
  if (!findBugByKey(key)) {
    return NextResponse.json({ error: `Unknown bug key: ${key}` }, { status: 400 });
  }
  return ok(setBugFlag(key, enabled));
}

function ok(flags: BugFlags): NextResponse {
  return NextResponse.json(flags, { status: 200 });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
