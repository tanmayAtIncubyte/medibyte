import { Pill, ShieldCheck } from "lucide-react";

import type { ProductType } from "@/data/products";
import { cn } from "@/lib/utils";

/**
 * Consistent OTC vs Prescription (Rx) signal used across catalog and detail.
 * The two wear Incubyte's own pastels — blush for a prescription, sage for
 * over-the-counter — rather than the brand green, so a prescription never reads
 * as just more brand colour. Colour is never the only signal: both carry text
 * and an icon.
 */
export function ProductTypeBadge({
  type,
  className,
}: {
  type: ProductType;
  className?: string;
}) {
  const isRx = type === "Rx";
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        isRx ? "bg-rx text-rx-foreground" : "bg-otc text-otc-foreground",
        className,
      )}
    >
      {isRx ? (
        <Pill className="size-3.5" aria-hidden />
      ) : (
        <ShieldCheck className="size-3.5" aria-hidden />
      )}
      {isRx ? "Prescription" : "Over the counter"}
    </span>
  );
}
