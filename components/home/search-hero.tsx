import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CtaChip } from "@/components/ui/cta-chip";
import { brand } from "@/lib/brand";

/**
 * The home page opens on a need, not a mood: headline, one line, and a search
 * box that lands on the catalog (`/products?q=`). The mint band is a
 * pseudo-element stretched to the viewport and pulled up behind the floating
 * nav, so the page itself stays white.
 */
export function SearchHero() {
  return (
    <section className="relative isolate -mt-10 pt-16 pb-16 before:pointer-events-none before:absolute before:-top-20 before:bottom-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:bg-secondary sm:pt-20 sm:pb-20">
      <p className="text-sm font-medium text-primary">{brand.name}</p>
      <h1 className="mt-3 max-w-3xl font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.01em] text-primary sm:text-[3.25rem]">
        {brand.tagline}
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/75">
        {brand.description}
      </p>

      <form
        action="/products"
        method="get"
        role="search"
        className="mt-7 flex h-[3.75rem] max-w-2xl items-center gap-2 rounded-full bg-card pl-6 pr-2 shadow-[0_10px_30px_rgba(1,77,67,0.10)]"
      >
        <Search aria-hidden className="size-5 shrink-0 text-primary" />
        <input
          type="search"
          name="q"
          autoComplete="off"
          placeholder="Search medicines, symptoms or brands"
          aria-label="Search products"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
        <span className="inline-flex items-center gap-1">
          <Button type="submit" size="lg">
            Search
          </Button>
          <CtaChip />
        </span>
      </form>
    </section>
  );
}
