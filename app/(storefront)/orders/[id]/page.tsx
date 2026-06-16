import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, MapPin } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { requireUser } from "@/lib/auth/guards";
import { getOrderForViewer } from "@/lib/data/orders";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Order detail" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { placed } = await searchParams;

  // Ownership enforced: a customer only sees their own order; anyone else's id
  // (or an unknown id) resolves to null -> styled 404. The IDOR bug that drops
  // this check is a Phase-4 toggle and is intentionally NOT built here.
  const order = getOrderForViewer(id, { id: user.id, role: user.role });
  if (!order) {
    notFound();
  }

  const justPlaced = placed === "1";

  return (
    <PageContainer>
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to orders
      </Link>

      {justPlaced && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-secondary/60 p-4"
        >
          <CheckCircle2 className="mt-0.5 size-5 text-primary" aria-hidden />
          <div>
            <p className="font-heading font-semibold text-foreground">
              Order placed — thank you!
            </p>
            <p className="text-sm text-muted-foreground">
              We&apos;ve received your order and are getting it ready.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Order {order.id}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatOrderDate(order.placedAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">Items</h2>
            <ul className="mt-4 divide-y divide-border">
              {order.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <ProductTypeBadge type={item.type} />
                    <p className="mt-1 text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {item.quantity} · {formatPrice(item.unitPrice)} each
                    </p>
                  </div>
                  <span className="font-heading text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {order.prescriptions.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="size-5" aria-hidden />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Prescription information
                </h2>
              </div>
              <div className="mt-4 space-y-4">
                {order.prescriptions.map((rx) => (
                  <div key={rx.productId} className="rounded-lg border border-border p-4">
                    <p className="text-sm font-semibold text-foreground">{rx.productName}</p>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <DetailRow label="Patient" value={rx.patientName} />
                      <DetailRow label="Date of birth" value={rx.dateOfBirth} />
                      <DetailRow label="Prescribing doctor" value={rx.prescribingDoctor} />
                      <DetailRow label="Prescription number" value={rx.prescriptionNumber} />
                      {rx.notes && (
                        <div className="sm:col-span-2">
                          <DetailRow label="Notes" value={rx.notes} />
                        </div>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="size-5" aria-hidden />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Shipping address
              </h2>
            </div>
            <address className="mt-3 text-sm not-italic text-foreground">
              {order.shipping.fullName}
              <br />
              {order.shipping.street}
              <br />
              {order.shipping.city}, {order.shipping.region} {order.shipping.postalCode}
              <br />
              {order.shipping.country}
            </address>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">Order total</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(order.totals.subtotal)} />
              {order.totals.discount > 0 && (
                <SummaryRow
                  label={`Discount${order.totals.couponCode ? ` (${order.totals.couponCode})` : ""}`}
                  value={`-${formatPrice(order.totals.discount)}`}
                  discount
                />
              )}
              <SummaryRow label="Tax (8%)" value={formatPrice(order.totals.tax)} />
              <div className="border-t border-border pt-3">
                <SummaryRow label="Total" value={formatPrice(order.totals.total)} emphasized />
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
  discount = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  discount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className={
          emphasized
            ? "font-heading text-base font-semibold text-foreground"
            : discount
              ? "text-primary"
              : "text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={
          emphasized
            ? "font-heading text-base font-bold tabular-nums text-foreground"
            : discount
              ? "tabular-nums text-primary"
              : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
