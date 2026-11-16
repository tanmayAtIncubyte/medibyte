import Link from "next/link";

import { Doors } from "@/components/home/doors";
import { ProductShelves } from "@/components/home/product-shelves";
import { SearchHero } from "@/components/home/search-hero";
import { PageContainer } from "@/components/layout/page-container";
import { listFeaturedProducts } from "@/lib/data/products";

// The home page is a medicine cabinet: search first, then three doors (over
// the counter, prescriptions, refills) beside the featured products on white
// shelves. The column widens to 90rem here only, so wide screens fill with
// products rather than margin.
export default function HomePage() {
  const featured = listFeaturedProducts();

  return (
    <PageContainer className="xl:max-w-[90rem]">
      <SearchHero />

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

        <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(17rem,0.9fr)_2.6fr] lg:items-stretch">
          <Doors />
          <ProductShelves products={featured} />
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
