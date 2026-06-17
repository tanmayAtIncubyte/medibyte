import { describe, expect, it, vi } from "vitest";

// GET /api/products now resolves the current user at the route boundary (for the
// Phase-4 performance flags). With all flags off the response is unchanged, but
// the call still reaches getCurrentUser → next/headers cookies(), which needs a
// request scope; stub it to "no user" so these baseline tests run standalone.
vi.mock("@/lib/auth/current-user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/current-user")>()),
  getCurrentUser: () => Promise.resolve(null),
}));

import { GET as listProductsRoute } from "@/app/api/products/route";
import { GET as productByIdRoute } from "@/app/api/products/[id]/route";

// Slice 2 — product read endpoints (real HTTP route handlers over mock data).
// AC 2: GET /api/products returns deterministic seed data as JSON with 200.
// AC 3: the same read endpoint twice returns identical data.
// AC 5: a non-existent resource id returns 404 with a JSON body.

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/products", () => {
  // AC 2
  it("responds 200 with a JSON array of products", async () => {
    const response = await listProductsRoute();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("returns products carrying the documented shape (id, name, price, type)", async () => {
    const body = await (await listProductsRoute()).json();

    for (const product of body) {
      expect(product).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          price: expect.any(Number),
          type: expect.stringMatching(/^(OTC|Rx)$/),
        }),
      );
    }
  });

  // AC 3
  it("returns identical data on two successive calls (no runtime randomness)", async () => {
    const first = await (await listProductsRoute()).json();
    const second = await (await listProductsRoute()).json();

    expect(second).toEqual(first);
  });
});

describe("GET /api/products/[id]", () => {
  // AC 5 (hit)
  it("responds 200 with the matching product for a known id", async () => {
    const response = await productByIdRoute(
      new Request("http://localhost/api/products/prod-lisinopril-10"),
      paramsFor("prod-lisinopril-10"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("prod-lisinopril-10");
    expect(body.type).toBe("Rx");
  });

  // AC 5 (miss): 404 with a JSON body — not a 200, not an HTML error page.
  it("responds 404 with a JSON error body for an unknown id", async () => {
    const response = await productByIdRoute(
      new Request("http://localhost/api/products/nope"),
      paramsFor("nope"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });
});
