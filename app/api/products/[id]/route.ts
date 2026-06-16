import { NextResponse } from "next/server";

import { findProductById } from "@/lib/data/products";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = findProductById(id);

  if (!product) {
    return NextResponse.json({ error: `Product '${id}' not found` }, { status: 404 });
  }

  return NextResponse.json(product);
}
