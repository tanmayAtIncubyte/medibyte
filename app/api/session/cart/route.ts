import { type NextRequest, NextResponse } from "next/server";

import { addToCart, getCart } from "@/lib/data/session-store";
import {
  attachSessionId,
  newSessionId,
  readSessionId,
} from "@/lib/data/session-id";

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
  return respondWithCart(request, 201, (sessionId) => ({
    items: addToCart(sessionId, productId, Number(quantity) || 1),
  }));
}
