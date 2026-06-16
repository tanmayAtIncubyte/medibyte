import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/current-user";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
