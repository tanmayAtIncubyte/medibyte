import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pill } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageContainer } from "@/components/layout/page-container";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { findProductById } from "@/lib/data/products";
import { formatPrice, stockLabel, stockStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = findProductById(id);

  if (!product) {
    notFound();
  }

  // Resolve seeded-bug flags at the boundary (the user lives here) and use plain
  // booleans below; the presentation helpers stay pure.
  const user = await getCurrentUser();
  const dropDecimal = isBugActive("FN_PRICE_DECIMALS", user);
  const inStockAtZero = isBugActive("FN_INSTOCK_AT_ZERO", user);
  const tripwireCopy = isBugActive("FN_TRIPWIRE_COPY", user);

  const status = stockStatus(product.stock);

  return (
    <PageContainer>
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-secondary/60">
          <Pill className="size-24 text-primary/70" aria-hidden />
        </div>

        <div className="flex flex-col">
          <ProductTypeBadge type={product.type} />
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{product.category}</p>

          <p className="mt-6 font-heading text-3xl font-bold tabular-nums text-foreground">
            {formatPrice(product.price, { dropDecimal })}
          </p>

          <p
            className={cn(
              "mt-2 text-sm font-medium",
              // FN_INSTOCK_AT_ZERO recolors a 0-stock item as available.
              (inStockAtZero && product.stock <= 0
                ? "in-stock"
                : status) === "out-of-stock"
                ? "text-destructive"
                : (inStockAtZero && product.stock <= 0 ? "in-stock" : status) ===
                    "low-stock"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {stockLabel(product.stock, { inStockAtZero })}
          </p>

          {product.requiresPrescription && (
            <div
              className="mt-5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
              role="note"
            >
              <p className="font-semibold">Prescription required</p>
              <p className="mt-0.5 text-primary/80">
                A pharmacist will verify a valid prescription before this item ships.
              </p>
            </div>
          )}

          <div className="mt-6">
            <AddToCartButton
              productId={product.id}
              disabled={status === "out-of-stock"}
            />
            {status === "out-of-stock" && (
              <p className="mt-2 text-xs text-muted-foreground">
                This item is currently unavailable.
              </p>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-foreground">
            {product.description}
          </p>

          {/*
            FN_TRIPWIRE_COPY (reading tripwire): an extra line of copy that
            contradicts the Rx/OTC badge shown above — Rx items claim no
            prescription is needed; OTC items claim a prescription is required.
            Only a non-admin customer with the flag on sees it.
          */}
          {tripwireCopy && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.type === "Rx"
                ? "No prescription needed — available over the counter for everyone."
                : "Prescription required: a pharmacist must verify your prescription before this item ships."}
            </p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
