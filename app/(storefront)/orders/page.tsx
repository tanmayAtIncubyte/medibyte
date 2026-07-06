import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { isBugActive } from "@/lib/bugs";
import { listAllOrders, listOrdersForUser } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/orders/types";

export const metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const user = await requireUser();

  // FN_ORDER_DATE_RAW: render the stored ISO timestamp verbatim instead of the
  // friendly localized date. Resolved here (the user lives in the guard) and
  // never for admin.
  const rawDate = isBugActive("FN_ORDER_DATE_RAW", user);

  // Customers see ONLY their own orders (seed + session-created), newest first.
  // Admins, who have no orders of their own, get a read view of all orders for
  // support — single-order ownership is still enforced on /orders/[id].
  const isAdmin = user.role === "admin";
  const orders = isAdmin ? await listAllOrders() : await listOrdersForUser(user.id);

  return (
    <PageContainer>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        {isAdmin ? "All orders" : "Your orders"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAdmin
          ? "Every order placed across the store."
          : "Your order history, newest first."}
      </p>

      {orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${encodeURIComponent(order.id)}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-heading text-base font-semibold text-foreground">
                      {order.id}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(rawDate ? order.placedAt : formatOrderDate(order.placedAt))} ·{" "}
                    {itemSummary(order)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-heading text-base font-bold tabular-nums text-foreground">
                    {formatPrice(order.totals.total)}
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function itemSummary(order: Order): string {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function EmptyOrders() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Package className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold text-foreground">No orders yet</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        When you place an order it will appear here for easy reordering and tracking.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/products">Shop products</Link>
      </Button>
    </div>
  );
}
