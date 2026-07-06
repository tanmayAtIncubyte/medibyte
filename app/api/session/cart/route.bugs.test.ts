import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Control the flag in-memory (no shared on-disk file → no cross-test race). The
// REAL isBugActiveWith still runs, so admin-clean is enforced by the engine.
let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import {
  PATCH as cartPatch,
  POST as cartPost,
} from "@/app/api/session/cart/route";
import { authenticate, toSessionPayload } from "@/lib/auth/accounts";
import { SESSION_COOKIE } from "@/lib/auth/current-user";
import { getSessionSecret } from "@/lib/auth/secret";
import { signSession } from "@/lib/auth/session";
import { SESSION_ID_COOKIE } from "@/lib/data/session-id";
import { resetAllSessions } from "@/lib/data/session-store";

// Toggle tests for the two cart-route bugs. The flag is resolved at the route
// boundary from the signed mb_session cookie, so we drive these over real HTTP
// with a customer vs admin session and an in-memory flag.

const SID = "sess-cart-bugs";

// authenticate is async (store reads go through the KV seam), so the session
// cookies are built in beforeAll rather than at module load.
async function sessionCookie(email: string, password: string): Promise<string> {
  const user = (await authenticate(email, password))!;
  return signSession(toSessionPayload(user), getSessionSecret());
}

let CUSTOMER_COOKIE: string;
let ADMIN_COOKIE: string;
beforeAll(async () => {
  CUSTOMER_COOKIE = await sessionCookie("dana@example.test", "dana1234");
  ADMIN_COOKIE = await sessionCookie("admin@medibyte.test", "admin1234");
});

function request(
  method: string,
  body: Record<string, unknown>,
  authCookie?: string,
): NextRequest {
  const cookies = [`${SESSION_ID_COOKIE}=${SID}`];
  if (authCookie) {
    cookies.push(`${SESSION_COOKIE}=${authCookie}`);
  }
  return new NextRequest("http://localhost/api/session/cart", {
    method,
    headers: { "content-type": "application/json", cookie: cookies.join("; ") },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  flags = {};
});
afterEach(async () => {
  await resetAllSessions();
  flags = {};
});

describe("FN_OOS_ADDABLE toggle (POST)", () => {
  // prod-fiber-supplement has stock 0 in the seed catalog.
  const OOS = { productId: "prod-fiber-supplement", quantity: 1 };

  it("flag off → adding an out-of-stock item is rejected for everyone", async () => {
    expect((await cartPost(request("POST", OOS, CUSTOMER_COOKIE))).status).toBe(409);
    expect((await cartPost(request("POST", OOS, ADMIN_COOKIE))).status).toBe(409);
  });

  it("flag on → customer can add the OOS item, admin still rejected", async () => {
    flags = { FN_OOS_ADDABLE: true };

    const customerRes = await cartPost(request("POST", OOS, CUSTOMER_COOKIE));
    expect(customerRes.status).toBe(201);
    const body = await customerRes.json();
    expect(body.items).toContainEqual({ productId: "prod-fiber-supplement", quantity: 1 });

    expect((await cartPost(request("POST", OOS, ADMIN_COOKIE))).status).toBe(409);
  });
});

describe("FN_QTY_NONPOSITIVE toggle (PATCH)", () => {
  async function setQtyZero(authCookie: string) {
    // Seed a line first (in-stock item, so POST succeeds regardless of flags).
    await cartPost(request("POST", { productId: "prod-ibuprofen-200", quantity: 2 }, authCookie));
    const res = await cartPatch(
      request("PATCH", { productId: "prod-ibuprofen-200", quantity: 0 }, authCookie),
    );
    return (await res.json()).items as { productId: string; quantity: number }[];
  }

  it("flag off → setting quantity 0 removes the line for everyone", async () => {
    expect(await setQtyZero(CUSTOMER_COOKIE)).toEqual([]);
    await resetAllSessions();
    expect(await setQtyZero(ADMIN_COOKIE)).toEqual([]);
  });

  it("flag on → customer persists the zero quantity, admin still removes the line", async () => {
    flags = { FN_QTY_NONPOSITIVE: true };

    expect(await setQtyZero(CUSTOMER_COOKIE)).toContainEqual({
      productId: "prod-ibuprofen-200",
      quantity: 0,
    });

    await resetAllSessions();
    expect(await setQtyZero(ADMIN_COOKIE)).toEqual([]);
  });
});
