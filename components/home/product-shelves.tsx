import Link from "next/link";
import type { ReactNode } from "react";

import type { Product } from "@/data/products";
import { ProductCatalog } from "@/components/products/product-catalog";

/**
 * The featured products on two white shelves — over the counter, then
 * prescription — so the split a shopper actually cares about is the first
 * thing the layout says. The colour code lives in the badges and the doors
 * beside the shelves; the shelves themselves stay white to be read.
 *
 * Renders the same `ProductCatalog` cards as /products, with no seeded-bug
 * switches: the home page is clean for everyone.
 */
export function ProductShelves({ products }: { products: Product[] }) {
  const otc = products.filter((p) => p.type === "OTC");
  const rx = products.filter((p) => p.type === "Rx");

  return (
    <div className="flex flex-col gap-10">
      <Shelf title="Over the counter" count={otc.length} href="/products?type=OTC" products={otc} />
      <Shelf
        title="Prescription"
        count={rx.length}
        href="/products?type=Rx"
        products={rx}
        trailing={
          <div className="flex flex-1 flex-col justify-end gap-2 rounded-xl border border-dashed border-rx-foreground/40 p-6 text-rx-foreground">
            <p className="font-heading text-[1.2rem] font-semibold leading-tight">
              Need a valid prescription.
            </p>
            <p className="text-sm leading-relaxed text-rx-foreground/85">
              You&apos;ll be asked for the details at checkout.
            </p>
          </div>
        }
      />
    </div>
  );
}

function Shelf({
  title,
  count,
  href,
  products,
  trailing,
}: {
  title: string;
  count: number;
  href: string;
  products: Product[];
  trailing?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-heading text-[1.6rem] font-semibold tracking-tight text-foreground">
          {title}{" "}
          <span className="text-[1.05rem] font-normal text-muted-foreground">{count}</span>
        </h3>
        <Link
          href={href}
          className="shrink-0 rounded text-sm font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Browse all
        </Link>
      </div>
      <div className="mt-5">
        <ProductCatalog products={products} trailing={trailing} />
      </div>
    </div>
  );
}
