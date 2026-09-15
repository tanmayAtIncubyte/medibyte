import Link from "next/link";

import { cn } from "@/lib/utils";

type Tile = {
  label: string;
  href: string;
  /** Tile ground + the quarter-circle "pill" in its corner + label colour. */
  tile: string;
  pill: string;
  ink: string;
};

const categoryHref = (category: string) =>
  `/products?category=${encodeURIComponent(category)}`;

// Real catalog categories (see data/products.ts) plus one door into the
// prescription range. Colours rotate through the brand palette; the last tile
// takes the blush that marks prescription items everywhere else in the app.
const TILES: Tile[] = [
  { label: "Pain Relief", href: categoryHref("Pain Relief"), tile: "bg-primary", pill: "fill-secondary", ink: "text-primary-foreground" },
  { label: "Cold & Flu", href: categoryHref("Cold & Flu"), tile: "bg-secondary", pill: "fill-primary", ink: "text-primary" },
  { label: "Allergy", href: categoryHref("Allergy"), tile: "bg-otc", pill: "fill-lime", ink: "text-primary" },
  { label: "Digestive Health", href: categoryHref("Digestive Health"), tile: "bg-lime", pill: "fill-primary", ink: "text-primary" },
  { label: "Sleep & Wellness", href: categoryHref("Sleep & Wellness"), tile: "bg-primary", pill: "fill-lime", ink: "text-primary-foreground" },
  { label: "Vitamins & Supplements", href: categoryHref("Vitamins & Supplements"), tile: "bg-secondary", pill: "fill-primary", ink: "text-primary" },
  { label: "First Aid", href: categoryHref("First Aid"), tile: "bg-otc", pill: "fill-primary", ink: "text-primary" },
  { label: "Prescriptions", href: "/products?type=Rx", tile: "bg-rx", pill: "fill-rx-foreground", ink: "text-rx-foreground" },
];

/**
 * The blister strip: eight category tiles that straddle the seam between the
 * mint hero and the white page. Incubyte's quarter-circle tile motif, given a
 * job — each tile is a way into the catalog, and the shape reads as the pill
 * in a blister pack.
 */
export function CategoryStrip() {
  return (
    <nav
      aria-label="Shop by category"
      className="relative -mt-11 grid grid-cols-4 gap-3 sm:gap-3.5 lg:grid-cols-8"
    >
      {TILES.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={cn(
            "relative block aspect-[1/0.9] overflow-hidden rounded-[20px] shadow-[0_8px_24px_rgba(1,77,67,0.10)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            t.tile,
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={cn("absolute -top-[8%] -right-[8%] h-[62%] w-[56%]", t.pill)}
          >
            <path d="M100 100 V0 H0 A100 100 0 0 0 100 100Z" />
          </svg>
          <span
            className={cn(
              "absolute inset-x-3 bottom-3 text-sm font-semibold leading-[1.15] tracking-[-0.005em] sm:inset-x-4 sm:bottom-4 sm:text-[1.05rem]",
              t.ink,
            )}
          >
            {t.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
