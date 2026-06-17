import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartLinePrefetch } from "@/components/cart/cart-line-prefetch";

// Behavior of the PERF_CART_WATERFALL client island in isolation:
//   - waterfall off → makes ZERO extra requests (uses the data already on page);
//   - waterfall on  → fires one /api/products/[id] request PER line, sequentially
//     (the observable N+1 waterfall).

const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const IDS = ["prod-a", "prod-b", "prod-c"];

describe("CartLinePrefetch", () => {
  it("makes no extra requests when waterfall is off", async () => {
    render(<CartLinePrefetch productIds={IDS} waterfall={false} />);
    // Give any (absent) effect a tick to run.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches each line's product one-by-one when waterfall is on", async () => {
    render(<CartLinePrefetch productIds={IDS} waterfall />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(IDS.length);
    });
    for (const id of IDS) {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/products/${id}`,
        expect.objectContaining({ cache: "no-store" }),
      );
    }
  });
});
