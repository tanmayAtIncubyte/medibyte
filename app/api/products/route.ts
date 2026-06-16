import { NextResponse } from "next/server";

import { listProducts } from "@/lib/data/products";

export function GET() {
  return NextResponse.json(listProducts());
}
