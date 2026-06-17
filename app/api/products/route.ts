import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { listProducts } from "@/lib/data/products";
import { bloatProductsPayload } from "@/lib/perf/simulated-latency";

export async function GET() {
  // Resolve seeded performance flags at the route boundary (the user lives in
  // the signed cookie here); admins / flag-off always get the clean lean,
  // cacheable response.
  const user = await getCurrentUser();
  const overfetch = isBugActive("PERF_OVERFETCH_PAYLOAD", user);
  const noCache = isBugActive("PERF_NO_CACHE", user);

  const products = listProducts();

  // PERF_OVERFETCH_PAYLOAD (simulated): when on, return a bloated, duplicated
  // payload far larger than the catalog grid needs (observable as a large
  // response size in DevTools Network). Clean path returns the lean list.
  const body: unknown = overfetch ? bloatProductsPayload(products) : products;

  const response = NextResponse.json(body);

  // PERF_NO_CACHE (simulated): when on, force `Cache-Control: no-store` so the
  // browser refetches the full catalog on every navigation (observable as
  // repeated identical requests in Network). Clean path lets the response be
  // cached/reused normally.
  if (noCache) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }

  return response;
}
