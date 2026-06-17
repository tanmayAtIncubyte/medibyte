import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/auth/accounts";
import type { Order } from "@/lib/orders/types";

// Toggle test for FN_ORDER_DATE_RAW: the order date renders as the raw ISO
// timestamp instead of a friendly date. The flag is resolved in the page (which
// has the user); admin must always see the friendly date.

const requireUserMock = vi.fn<() => Promise<SessionUser>>();
vi.mock("@/lib/auth/guards", () => ({
  requireUser: () => requireUserMock(),
}));

const order: Order = {
  id: "ord-1",
  userId: "user-customer-dana",
  status: "processing",
  placedAt: "2026-01-15T09:30:00.000Z",
  items: [{ productId: "p", productName: "P", quantity: 1, unitPrice: 5, lineTotal: 5 }],
  totals: { lines: [], itemCount: 1, subtotal: 5, discount: 0, tax: 0.4, total: 5.4 },
  shipping: {
    fullName: "Dana",
    street: "1 Main",
    city: "C",
    region: "R",
    postalCode: "12345",
    country: "USA",
  },
  prescriptions: [],
} as unknown as Order;

vi.mock("@/lib/data/orders", () => ({
  listOrdersForUser: () => [order],
  listAllOrders: () => [order],
}));
let flags: Record<string, boolean> = {};
vi.mock("@/lib/bug-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bug-flags")>()),
  loadBugFlags: () => flags,
}));

import OrdersPage from "@/app/(storefront)/orders/page";

const customer: SessionUser = {
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

const RAW = "2026-01-15T09:30:00.000Z";
const FRIENDLY = "Jan 15, 2026";

async function renderOrders() {
  cleanup();
  render(await OrdersPage());
}

beforeEach(() => {
  flags = {};
});
afterEach(() => {
  vi.clearAllMocks();
  flags = {};
});

describe("FN_ORDER_DATE_RAW toggle", () => {
  it("flag off → friendly date for everyone", async () => {
    requireUserMock.mockResolvedValue(customer);
    await renderOrders();
    expect(screen.getByText(new RegExp(FRIENDLY))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(RAW))).not.toBeInTheDocument();
  });

  it("flag on → raw ISO for a customer, friendly date for an admin", async () => {
    flags = { FN_ORDER_DATE_RAW: true };

    requireUserMock.mockResolvedValue(customer);
    await renderOrders();
    expect(screen.getByText(new RegExp(RAW))).toBeInTheDocument();

    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(admin);
    await renderOrders();
    expect(screen.getByText(new RegExp(FRIENDLY))).toBeInTheDocument();
  });
});
