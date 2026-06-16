import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageContainer } from "@/components/layout/page-container";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { getCartView } from "@/lib/cart/cart-service";
import { rxLines } from "@/lib/orders/checkout";
import { readSessionIdFromCookies } from "@/lib/data/session-id";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const sessionId = await readSessionIdFromCookies();
  // Keep the checkout summary consistent with the same money bugs as the cart
  // (resolved here where the user lives); admins always see clean totals.
  const cart = getCartView(sessionId ?? "__none__", {
    taxFloor: isBugActive("FN_TAX_FLOOR", user),
    ignoreExpiry: isBugActive("FN_EXPIRED_COUPON_OK", user),
    taxBeforeDiscount: isBugActive("FN_TAX_BEFORE_DISCOUNT", user),
    couponNegative: isBugActive("FN_COUPON_NEGATIVE", user),
    roundingEdge: isBugActive("FN_TOTAL_ROUNDING_EDGE", user),
  });

  if (cart.lines.length === 0) {
    return (
      <PageContainer>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Checkout
        </h1>
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <ShoppingCart className="size-6" aria-hidden />
          </span>
          <p className="mt-4 font-heading text-lg font-semibold text-foreground">
            Your cart is empty
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add an item to your cart before checking out.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/products">Shop products</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const rx = rxLines(cart.lines).map((line) => ({
    productId: line.product.id,
    productName: line.product.name,
  }));

  const applied = cart.appliedCoupon;

  return (
    <PageContainer>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Checkout
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your shipping details
        {rx.length > 0 ? " and prescription information " : " "}
        to place your order.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm
            rxItems={rx}
            defaultFullName={user?.name ?? ""}
          />
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Order summary
            </h2>
            <ul className="mt-4 space-y-3">
              {cart.lines.map((line) => (
                <li key={line.product.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <ProductTypeBadge type={line.product.type} />
                    <p className="mt-1 truncate text-sm text-foreground">
                      {line.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qty {line.quantity} · {formatPrice(line.product.price)} each
                    </p>
                  </div>
                  <span className="font-heading text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <SummaryRow
                label={`Subtotal (${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"})`}
                value={formatPrice(cart.subtotal)}
              />
              {applied && (
                <SummaryRow
                  label={`Discount (${applied.coupon.code})`}
                  value={`-${formatPrice(applied.discount)}`}
                  discount
                />
              )}
              <SummaryRow label="Tax (8%)" value={formatPrice(cart.tax)} />
              <div className="border-t border-border pt-3">
                <SummaryRow label="Total" value={formatPrice(cart.total)} emphasized />
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </PageContainer>
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
