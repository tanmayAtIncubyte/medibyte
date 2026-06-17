import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getAdminOrNull } from "@/lib/auth/guards";
import { findBugByKey } from "@/lib/bug-registry";

// Admin-guarded reviewer answer-key images. Serves the clean (admin) vs buggy
// (customer) screenshots for a bug from a NON-public folder so they are never
// candidate-accessible. This is a genuine access-control boundary (not a seeded
// bug): non-admins always get 403. A missing file is a 404 so the panel can show
// its "Screenshot pending" placeholder before any screenshots are captured.
//
// Files live at: private/bug-shots/<KEY>-<variant>.png (variant = clean | buggy).
type Variant = "clean" | "buggy";

const SHOTS_DIR = path.join(process.cwd(), "private", "bug-shots");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  // Defense-in-depth: re-check admin here regardless of the page guard.
  if (!(await getAdminOrNull())) {
    return forbidden();
  }

  const { key } = await params;
  // Only real registry keys are served; unknown keys can never reach the disk.
  if (!findBugByKey(key)) {
    return notFound();
  }

  const variant = parseVariant(new URL(request.url).searchParams.get("variant"));
  if (!variant) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }

  // key is a validated registry key (no separators / traversal); compose the
  // path and confirm it stays inside the shots dir as a belt-and-braces check.
  const filePath = path.join(SHOTS_DIR, `${key}-${variant}.png`);
  if (!filePath.startsWith(SHOTS_DIR + path.sep)) {
    return notFound();
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    // Not captured yet (ENOENT) → 404 so the panel placeholder kicks in.
    return notFound();
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Private answer-key asset: never cache in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}

function parseVariant(value: string | null): Variant | null {
  return value === "clean" || value === "buggy" ? value : null;
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
