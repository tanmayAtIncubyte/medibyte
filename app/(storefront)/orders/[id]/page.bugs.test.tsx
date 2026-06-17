import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";
import type { Order } from "@/lib/orders/types";

// Toggle tests for the order-detail page bugs:
//   SEC_IDOR_ORDER — ownership check dropped so a customer sees a foreign order.
//   UX_NO_ORDER_CONFIRM — the post-checkout success banner is suppressed.
// Both flags are resolved on the page (which has the user); admins are never
// affected. getOrderForViewer is mocked to a fixed foreign order so we can
// assert the dropOwnershipCheck boolean the page passes in actually changes the
// lookup, and notFound() is mocked to throw a sentinel we can detect.

const requireUserMock = vi.fn<() => Promise<SessionUser>>();
vi.mock("@/lib/auth/guards", () => ({
  requireUser: () => requireUserMock(),
}));

class NotFoundError extends Error {}
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundError("not-found");
  },
}));

const omarsOrder = {
  id: "MB-OMAR-0001",
  userId: "user-customer-omar",
  placedAt: "2026-01-10T00:00:00.000Z",
  status: "processing",
  items: [
    { productId: "p", name: "Item", type: "OTC", unitPrice: 5, quantity: 1, lineTotal: 5 },
  ],
  totals: { subtotal: 5, discount: 0, tax: 0.4, total: 5.4, couponCode: null },
  shipping: {
    fullName: "Omar Patient",
    street: "1 Elm",
    city: "C",
    region: "R",
    postalCode: "00001",
    country: "USA",
  },
  prescriptions: [],
} as unknown as Order;

// The page passes { dropOwnershipCheck } in; emulate the real resolver: a
// foreign order is only returned when the check is dropped (or the viewer owns
// it / is admin).
const getOrderForViewerMock = vi.fn();
vi.mock("@/lib/data/orders", () => ({
  getOrderForViewer: (
    id: string,
    viewer: { id: string; role: string },
    bugs?: { dropOwnershipCheck?: boolean },
  ) => getOrderForViewerMock(id, viewer, bugs),
}));

let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import OrderDetailPage from "@/app/(storefront)/orders/[id]/page";

const dana: SessionUser = {
  id: "user-customer-dana",
  name: "Dana",
  email: "dana@example.test",
  role: "customer",
};
const admin: SessionUser = {
  id: "user-admin",
  name: "Admin",
  email: "admin@medibyte.test",
  role: "admin",
};

function realResolve(
  id: string,
  viewer: { id: string; role: string },
  bugs?: { dropOwnershipCheck?: boolean },
): Order | null {
  if (id !== omarsOrder.id) return null;
  if (viewer.role === "admin") return omarsOrder;
  if (bugs?.dropOwnershipCheck) return omarsOrder;
  return omarsOrder.userId === viewer.id ? omarsOrder : null;
}

async function renderPage(placed = false) {
  cleanup();
  const element = await OrderDetailPage({
    params: Promise.resolve({ id: omarsOrder.id }),
    searchParams: Promise.resolve(placed ? { placed: "1" } : {}),
  });
  render(element);
}

beforeEach(() => {
  flags = {};
  getOrderForViewerMock.mockImplementation(realResolve);
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("SEC_IDOR_ORDER toggle (order detail page)", () => {
  it("flag off → a customer requesting a foreign order gets notFound()", async () => {
    requireUserMock.mockResolvedValue(dana);
    await expect(renderPage()).rejects.toBeInstanceOf(NotFoundError);
    // The page asked for the enforced lookup.
    expect(getOrderForViewerMock).toHaveBeenCalledWith(
      omarsOrder.id,
      expect.objectContaining({ id: dana.id }),
      { dropOwnershipCheck: false },
    );
  });

  it("flag on → a customer can view a foreign order; admin's lookup stays enforced", async () => {
    flags = { SEC_IDOR_ORDER: true };

    requireUserMock.mockResolvedValue(dana);
    await renderPage();
    expect(screen.getByText(`Order ${omarsOrder.id}`)).toBeInTheDocument();
    expect(getOrderForViewerMock).toHaveBeenLastCalledWith(
      omarsOrder.id,
      expect.objectContaining({ id: dana.id }),
      { dropOwnershipCheck: true },
    );

    // Admin: the flag is inert, so dropOwnershipCheck is false (still allowed
    // because admins may view any order).
    vi.clearAllMocks();
    getOrderForViewerMock.mockImplementation(realResolve);
    requireUserMock.mockResolvedValue(admin);
    await renderPage();
    expect(getOrderForViewerMock).toHaveBeenLastCalledWith(
      omarsOrder.id,
      expect.objectContaining({ id: admin.id }),
      { dropOwnershipCheck: false },
    );
  });
});

describe("UX_NO_ORDER_CONFIRM toggle (order detail page)", () => {
  it("flag off → the 'Order placed' banner shows after checkout for everyone", async () => {
    requireUserMock.mockResolvedValue({ ...dana, id: omarsOrder.userId });
    await renderPage(true);
    expect(screen.getByText(/Order placed/i)).toBeInTheDocument();
  });

  it("flag on → no success banner for a customer, still shown for an admin", async () => {
    flags = { UX_NO_ORDER_CONFIRM: true };

    requireUserMock.mockResolvedValue({ ...dana, id: omarsOrder.userId });
    await renderPage(true);
    expect(screen.queryByText(/Order placed/i)).not.toBeInTheDocument();

    vi.clearAllMocks();
    getOrderForViewerMock.mockImplementation(realResolve);
    requireUserMock.mockResolvedValue(admin);
    await renderPage(true);
    expect(screen.getByText(/Order placed/i)).toBeInTheDocument();
  });
});
