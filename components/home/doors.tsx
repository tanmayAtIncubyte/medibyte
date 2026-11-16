import { BellRing, CircleCheck, Pill, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { RefillReminder } from "@/components/home/refill-reminder";
import { CtaChip } from "@/components/ui/cta-chip";
import { cn } from "@/lib/utils";

type DoorProps = {
  title: string;
  body: string;
  hint: string;
  /** Front colour classes — card ground and the icon that sits in the bubble. */
  ground: string;
  iconTone: string;
  icon: ReactNode;
  points: [string, string, string];
  /** The action on the back: a link into the catalog, or the refill control. */
  action: ReactNode;
};

/**
 * Three "doors" into the store, modelled on incubyte.co's service cards
 * (colours measured off their DOM): a tile field with a white icon bubble, a
 * Fraunces title, one plain line, and a hint of what's behind it. Hovering or
 * focusing flips the door to its navy back — three short points and the one
 * action. Motion answers the user's action only; with reduced motion the sides
 * crossfade instead of rotating.
 */
export function Doors() {
  return (
    <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 lg:grid-rows-3">
      <Door
        title="Over the counter"
        body="Everyday essentials with no prescription needed — pain relief, allergy, cold & flu, vitamins and first aid."
        hint="Browse over the counter"
        ground="bg-door-chartreuse"
        iconTone="text-door-chartreuse"
        icon={<ShieldCheck className="size-8" strokeWidth={1.8} aria-hidden />}
        points={[
          "No prescription needed",
          "Pain relief, allergy, cold & flu, vitamins, first aid",
          "Add to cart and check out in minutes",
        ]}
        action={<BackLink href="/products?type=OTC">Browse over the counter</BackLink>}
      />
      <Door
        title="Prescriptions"
        body="Bring a valid prescription to checkout. A pharmacist reviews every prescription order before it ships."
        hint="Browse prescription items"
        ground="bg-door-teal"
        iconTone="text-door-teal"
        icon={<Pill className="size-8" strokeWidth={1.8} aria-hidden />}
        points={[
          "Valid prescription details at checkout",
          "Pharmacist review before dispatch",
          "Clearly marked on every product",
        ]}
        action={<BackLink href="/products?type=Rx">Browse prescription items</BackLink>}
      />
      <Door
        title="Never run out"
        body="Set a refill reminder and we’ll nudge you before your supply runs low. Your details stay private."
        hint="Set a refill reminder"
        ground="bg-door-green"
        iconTone="text-door-green"
        icon={<BellRing className="size-8" strokeWidth={1.8} aria-hidden />}
        points={[
          "A nudge before your supply runs low",
          "Works for anything you order",
          "Your details stay private",
        ]}
        action={<RefillReminder tone="onPanel" />}
      />
    </div>
  );
}

function Door({ title, body, hint, ground, iconTone, icon, points, action }: DoorProps) {
  return (
    <article className="group relative min-h-[21rem] [perspective:1400px]">
      <div className="relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] group-focus-within:[transform:rotateY(180deg)] group-hover:[transform:rotateY(180deg)] motion-reduce:transition-none motion-reduce:group-focus-within:[transform:none] motion-reduce:group-hover:[transform:none]">
        {/* Front */}
        <div
          className={cn(
            "flex h-full flex-col overflow-hidden rounded-[28px] text-foreground [backface-visibility:hidden] motion-reduce:transition-opacity motion-reduce:group-focus-within:opacity-0 motion-reduce:group-hover:opacity-0",
            ground,
          )}
        >
          <div className="relative h-36 shrink-0">
            <TileField />
            <span
              className={cn(
                "absolute top-0 right-0 flex size-[5.75rem] items-center justify-center rounded-tr-[28px] rounded-bl-[2.75rem] bg-card",
                iconTone,
              )}
            >
              {icon}
            </span>
          </div>
          <div className="flex flex-1 flex-col px-6 pt-5 pb-6">
            <h3 className="font-heading text-[1.75rem] font-semibold leading-[1.1] tracking-tight">
              {title}
            </h3>
            <p className="mt-3 text-base leading-relaxed">{body}</p>
            <p className="mt-auto pt-5 text-[1.05rem] font-medium">{hint}</p>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex flex-col rounded-[28px] bg-footer px-6 pt-7 pb-6 text-footer-foreground [backface-visibility:hidden] [transform:rotateY(180deg)] motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:[transform:none] motion-reduce:group-focus-within:opacity-100 motion-reduce:group-hover:opacity-100">
          <h3 className="font-heading text-[1.75rem] font-semibold leading-[1.1] tracking-tight">
            {title}
          </h3>
          <ul className="mt-5 divide-y divide-white/10 text-[0.95rem]">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 py-3">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-door-teal" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-5">{action}</div>
        </div>
      </div>
    </article>
  );
}

function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full font-medium text-footer-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime/60"
    >
      {children}
      <CtaChip size="sm" />
    </Link>
  );
}

/** Incubyte's card art: white leaf and quarter-circle tiles at low alpha over the card colour. */
function TileField() {
  const leaf = "M0 75 A75 75 0 0 1 75 0 A75 75 0 0 1 0 75Z";
  const quarterTR = "M75 75 V0 H0 A75 75 0 0 0 75 75Z";
  const quarterBL = "M0 0 V75 H75 A75 75 0 0 0 0 0Z";
  const tiles: Array<[number, number, string | null]> = [
    [0, 0, leaf], [75, 0, quarterTR], [150, 0, null], [225, 0, leaf],
    [0, 75, quarterBL], [75, 75, leaf], [150, 75, quarterTR], [225, 75, null],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 150"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      {tiles.map(([x, y, d]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect width="75" height="75" rx="6" fill="none" stroke="#fff" strokeOpacity=".35" />
          {d ? <path d={d} fill="#fff" fillOpacity=".28" /> : null}
        </g>
      ))}
    </svg>
  );
}
