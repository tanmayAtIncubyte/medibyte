import { NextResponse } from "next/server";

import { getAdminOrNull } from "@/lib/auth/guards";
import { findBugByKey } from "@/lib/bug-registry";
import {
  loadBugFlags,
  resetBugFlags,
  setBugFlag,
  type BugFlags,
} from "@/lib/bug-flags";

export async function GET() {
  if (!(await getAdminOrNull())) {
    return forbidden();
  }
  return NextResponse.json(loadBugFlags(), { status: 200 });
}

export async function POST(request: Request) {
  if (!(await getAdminOrNull())) {
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
