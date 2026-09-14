import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The lime circle that rides beside a primary call to action — Incubyte's most
 * recognisable component. It is purely decorative chrome for the button next to
 * it: `aria-hidden`, never focusable, never a control of its own. Place it
 * immediately after a pill button inside an `inline-flex items-center gap-1`.
 */
export function CtaChip({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-lime text-lime-foreground",
        size === "sm" ? "size-9" : "size-11",
        className,
      )}
    >
      <ArrowUpRight className={size === "sm" ? "size-4" : "size-5"} strokeWidth={2.25} />
    </span>
  );
}
