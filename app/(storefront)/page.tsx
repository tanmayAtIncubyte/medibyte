import Link from "next/link";

import { PromoPanel } from "@/components/home/promo-panel";
import { PageContainer } from "@/components/layout/page-container";
import { ProductCatalog } from "@/components/products/product-catalog";
import { brand } from "@/lib/brand";
import { listFeaturedProducts } from "@/lib/data/products";

export default function HomePage() {
  const featured = listFeaturedProducts();

  return (
    <PageContainer>
      {/* Type-led hero: a big green serif on the mint page — the move that makes
          this read as one family with incubyte.co. */}
      <section className="pt-8 pb-12 sm:pt-14">
        <p className="text-sm font-medium text-primary">{brand.name}</p>
        <h1 className="mt-4 max-w-3xl font-heading text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.01em] text-primary sm:text-[5rem]">
          {brand.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">
          {brand.description}
        </p>
      </section>

      <PromoPanel />

      {/* Featured products — server-rendered, visible without clicking "Browse" */}
      <section className="mt-16" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              id="featured-heading"
              className="font-heading text-[2rem] font-semibold leading-[1.08] tracking-tight text-foreground"
            >
              Featured products
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A hand-picked mix of everyday essentials and prescription care.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 rounded text-sm font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline-flex"
          >
            View all products
          </Link>
        </div>

        <div className="mt-8">
          <ProductCatalog products={featured} />
        </div>

        <div className="mt-10 flex justify-center sm:hidden">
          <Link
            href="/products"
            className="rounded text-sm font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all products
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
