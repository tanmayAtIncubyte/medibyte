import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RefillReminder } from "@/components/home/refill-reminder";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCatalog } from "@/components/products/product-catalog";
import { brand } from "@/lib/brand";
import { listFeaturedProducts } from "@/lib/data/products";

export default function HomePage() {
  const featured = listFeaturedProducts();

  return (
    <PageContainer>
      {/* Slim branded hero */}
      <section className="rounded-2xl bg-secondary px-6 py-10 sm:px-10 sm:py-12">
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
          {brand.name}
        </p>
        <h1 className="mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {brand.tagline}
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
          {brand.description}
        </p>
        <div className="mt-6">
          <RefillReminder />
        </div>
      </section>

      {/* Featured products — server-rendered, visible without clicking "Browse" */}
      <section className="mt-10" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="featured-heading"
              className="font-heading text-2xl font-bold tracking-tight text-foreground"
            >
              Featured products
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A hand-picked mix of everyday essentials and prescription care.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded sm:inline-flex"
          >
            View all products
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-6">
          <ProductCatalog products={featured} />
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded"
          >
            View all products
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
