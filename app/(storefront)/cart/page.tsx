import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { CartLineControls } from "@/components/cart/cart-line-controls";
import { CartLinePrefetch } from "@/components/cart/cart-line-prefetch";
import { CouponForm } from "@/components/cart/coupon-form";
import { PageContainer } from "@/components/layout/page-container";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { Button } from "@/components/ui/button";
import { getCartView } from "@/lib/cart/cart-service";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { readSessionIdFromCookies } from "@/lib/data/session-id";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Your cart" };

export default async function CartPage() {
  const sessionId = await readSessionIdFromCookies();
  // Resolve seeded-bug flags at the boundary (the user lives here) and pass
  // plain booleans into the pure cart view; admins always get clean totals.
  const user = await getCurrentUser();
  const cart = await getCartView(sessionId ?? "__none__", {
    totalStale: isBugActive("FN_CART_TOTAL_STALE", user),
    taxFloor: isBugActive("FN_TAX_FLOOR", user),
    ignoreExpiry: isBugActive("FN_EXPIRED_COUPON_OK", user),
    taxBeforeDiscount: isBugActive("FN_TAX_BEFORE_DISCOUNT", user),
    couponNegative: isBugActive("FN_COUPON_NEGATIVE", user),
    roundingEdge: isBugActive("FN_TOTAL_ROUNDING_EDGE", user),
  });
  const applied = cart.appliedCoupon;

  // Accessibility seeded-bug switches resolved at the boundary and passed into
  // the (otherwise clean) cart components as plain booleans; admins get clean.
  const couponNoLabel = isBugActive("A11Y_INPUT_NO_LABEL", user);
  const qtyNoKeyboardFocus = isBugActive("A11Y_NO_KEYBOARD_FOCUS", user);

  // PERF_CART_WATERFALL: when on, a client island re-fetches each line's product
  // sequentially (N+1) even though the data is already on the page; admins /
  // flag-off make no extra requests and use the rendered data directly.
  const cartWaterfall = isBugActive("PERF_CART_WATERFALL", user);
  const lineProductIds = cart.lines.map((line) => line.product.id);

  // UI antipattern / UX seeded-bug switches resolved at the boundary and passed
  // into the (otherwise clean) cart UI as plain booleans; admins get clean.
  const removeWithoutConfirm = isBugActive("UI_DESTRUCTIVE_NO_CONFIRM", user);
  const misleadingRemoveIcon = isBugActive("UI_MISLEADING_ICON", user);
  // UX_SURPRISE_TAX: when on, hide the tax line on the cart so tax only surfaces
  // at the final checkout step (a surprise at the end). Clean shows it here.
  const hideTaxOnCart = isBugActive("UX_SURPRISE_TAX", user);

  return (
    <PageContainer>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Your cart
      </h1>

      {cart.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <CartLinePrefetch productIds={lineProductIds} waterfall={cartWaterfall} />
          <ul className="space-y-4 lg:col-span-2">
            {cart.lines.map((line) => (
              <li
                key={line.product.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <ProductTypeBadge type={line.product.type} />
                  <h2 className="mt-2 font-heading text-base font-semibold text-foreground">
                    <Link
                      href={`/products/${line.product.id}`}
                      className="hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
                    >
                      {line.product.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(line.product.price)} each
                  </p>
                </div>
                <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
                  <p className="font-heading text-lg font-bold tabular-nums text-foreground">
                    {formatPrice(line.lineTotal)}
                  </p>
                  <CartLineControls
                    productId={line.product.id}
                    productName={line.product.name}
                    quantity={line.quantity}
                    noKeyboardFocus={qtyNoKeyboardFocus}
                    removeWithoutConfirm={removeWithoutConfirm}
                    misleadingRemoveIcon={misleadingRemoveIcon}
                  />
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Order summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
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
                {!hideTaxOnCart && (
                  <SummaryRow label="Tax (8%)" value={formatPrice(cart.tax)} />
                )}
                <div className="border-t border-border pt-3">
                  <SummaryRow
                    label={hideTaxOnCart ? "Subtotal" : "Total"}
                    value={formatPrice(hideTaxOnCart ? cart.subtotal - cart.discount : cart.total)}
                    emphasized
                  />
                </div>
              </dl>

              <div className="mt-5 border-t border-border pt-5">
                <CouponForm
                  applied={
                    applied
                      ? {
                          code: applied.coupon.code,
                          description: applied.coupon.description,
                        }
                      : null
                  }
                  noLabel={couponNoLabel}
                />
              </div>

              <Button asChild size="lg" className="mt-5 w-full">
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
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

function EmptyCart() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <ShoppingCart className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold text-foreground">
        Your cart is empty
      </p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Browse our over-the-counter and prescription range to get started.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/products">Shop products</Link>
      </Button>
    </div>
  );
}
