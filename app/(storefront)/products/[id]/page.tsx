import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pill } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageContainer } from "@/components/layout/page-container";
import { PageRail } from "@/components/layout/page-rail";
import { ProductTypeBadge } from "@/components/products/product-type-badge";
import { CtaChip } from "@/components/ui/cta-chip";
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
  // One stock string for the whole page: the price row and the spec list below
  // read the same value, so they can never disagree.
  const availability = stockLabel(product.stock, { inStockAtZero });
  const typeLabel = product.requiresPrescription
    ? "Prescription medicine"
    : "Over the counter";
  const categoryHref = `/products?category=${encodeURIComponent(product.category)}`;
  // No pack field in the catalogue: the pack size lives in the parenthesised
  // tail of the product name (e.g. "… (50 ct)"). Omitted when there is none.
  const pack = product.name.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;

  return (
    <PageContainer>
      <PageRail
        label="Where you are"
        items={[
          { label: "All products", href: "/products" },
          {
            label: product.requiresPrescription ? "Prescription" : "Over the counter",
            href: product.requiresPrescription ? "/products?type=Rx" : "/products?type=OTC",
          },
          { label: product.category, href: categoryHref },
          { label: "This product", current: true },
        ]}
      />

      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded min-[1640px]:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* The pack face. There is no product photography in this catalogue, so
            the panel is the product's box front instead of an empty image slot:
            the type, the name at display size, the category — on the pastel that
            already tells OTC from Rx apart. The pill is a corner stamp, not the
            subject. */}
        <section
          aria-label="Product"
          className={cn(
            "flex min-h-[22rem] flex-col justify-between rounded-2xl p-8 sm:min-h-[24rem] sm:p-10",
            product.requiresPrescription ? "bg-rx" : "bg-otc",
          )}
        >
          <ProductTypeBadge type={product.type} className="bg-white/70" />

          <h1
            className={cn(
              "my-8 text-balance font-heading text-[2.75rem] font-semibold leading-[1.04] tracking-tight sm:text-[3.5rem]",
              product.requiresPrescription ? "text-rx-foreground" : "text-primary",
            )}
          >
            {product.name}
          </h1>

          <div className="flex items-end justify-between gap-4">
            <p
              className={cn(
                "text-sm font-medium",
                product.requiresPrescription ? "text-rx-foreground/80" : "text-primary/80",
              )}
            >
              {product.category}
            </p>
            <Pill
              className={cn(
                "size-8 shrink-0 -rotate-45",
                product.requiresPrescription ? "text-rx-foreground/40" : "text-primary/40",
              )}
              aria-hidden
            />
          </div>
        </section>

        {/* The counter: price and availability on the label rule, then the action,
            then what the product is. */}
        <div className="flex flex-col lg:self-center">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-5">
            <p className="font-heading text-[2.5rem] font-semibold tabular-nums tracking-tight text-foreground">
              {formatPrice(product.price, { dropDecimal })}
            </p>

          <p
            className={cn(
              "text-sm font-medium",
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
            {availability}
          </p>
          </div>

          {/* The label on the back of the box: the facts a customer checks
              before adding to the basket, ruled like a spec sheet. Availability
              is the same string the price row shows — one source, never two. */}
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-7 text-[0.95rem]">
            <dt className="py-2.5 text-muted-foreground">Category</dt>
            <dd className="py-2.5 text-foreground">{product.category}</dd>

            <dt className="border-t border-border py-2.5 text-muted-foreground">Type</dt>
            <dd className="border-t border-border py-2.5 text-foreground">{typeLabel}</dd>

            {pack && (
              <>
                <dt className="border-t border-border py-2.5 text-muted-foreground">Pack</dt>
                <dd className="border-t border-border py-2.5 text-foreground">{pack}</dd>
              </>
            )}

            <dt className="border-t border-border py-2.5 text-muted-foreground">Availability</dt>
            <dd className="border-t border-border py-2.5 text-foreground">{availability}</dd>
          </dl>

          {product.requiresPrescription && (
            <div
              className="mt-5 rounded-2xl border border-rx-foreground/20 bg-rx px-5 py-4 text-sm text-rx-foreground"
              role="note"
            >
              <p className="font-semibold">Prescription required</p>
              <p className="mt-1 text-rx-foreground/80">
                A pharmacist will verify a valid prescription before this item ships.
              </p>
            </div>
          )}

          <div className="mt-6">
            <span className="inline-flex items-center gap-1">
              <AddToCartButton
                productId={product.id}
                disabled={status === "out-of-stock"}
              />
              {status !== "out-of-stock" && <CtaChip />}
            </span>
            {status === "out-of-stock" && (
              <p className="mt-2 text-xs text-muted-foreground">
                This item is currently unavailable.
              </p>
            )}
          </div>

          <p className="mt-8 max-w-prose text-base leading-relaxed text-foreground">
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

          <p className="mt-5 text-sm">
            <Link
              href={categoryHref}
              className="font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              More in {product.category}
            </Link>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
