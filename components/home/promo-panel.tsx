import { BellRing, ShieldCheck, Truck } from "lucide-react";

import { RefillReminder } from "@/components/home/refill-reminder";
import { brand } from "@/lib/brand";

/**
 * The dark green full-width panel — the page's one loud moment, modelled on
 * Incubyte's spotlight block: a tile motif behind the left edge, a serif
 * headline, one short paragraph, a white-pill CTA, then a hairline and a row of
 * plain-language assurances.
 */
export function PromoPanel() {
  return (
    <section
      aria-labelledby="promo-heading"
      className="relative mt-16 overflow-hidden rounded-2xl bg-panel px-6 py-10 text-panel-foreground sm:px-12 sm:py-14"
    >
      <TileMotif />

      <div className="relative max-w-2xl">
        <p className="text-sm font-medium text-lime">{brand.name}</p>
        <h2
          id="promo-heading"
          className="mt-3 font-heading text-[2.25rem] font-semibold leading-[1.05] tracking-tight sm:text-[2.75rem]"
        >
          Never run out of what you take every day.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-panel-foreground/80">
          Set a refill reminder and we&apos;ll nudge you before your supply runs low.
          Your prescription details stay private and are used only to fill your order.
        </p>

        <div className="mt-8">
          <RefillReminder tone="onPanel" />
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-panel-foreground/20 pt-6 text-sm text-panel-foreground/85">
          <Assurance icon={<BellRing className="size-4" aria-hidden />}>
            Refill reminders
          </Assurance>
          <Assurance icon={<ShieldCheck className="size-4" aria-hidden />}>
            Pharmacist review
          </Assurance>
          <Assurance icon={<Truck className="size-4" aria-hidden />}>
            Delivered to your door
          </Assurance>
        </ul>
      </div>
    </section>
  );
}

function Assurance({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-lime">{icon}</span>
      {children}
    </li>
  );
}

/** Quarter-circle tile field, low contrast, behind the left edge of the panel. */
function TileMotif() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/3 opacity-[0.16] [mask-image:linear-gradient(to_right,black_35%,transparent)] sm:block"
      viewBox="0 0 400 400"
      preserveAspectRatio="xMinYMid slice"
    >
      <defs>
        <pattern id="mb-tiles" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M0 0h100v100A100 100 0 0 0 0 0z" fill="#d3fe73" />
          <path d="M100 100H0V0a100 100 0 0 1 100 100z" fill="#5dc6d6" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#mb-tiles)" />
    </svg>
  );
}
