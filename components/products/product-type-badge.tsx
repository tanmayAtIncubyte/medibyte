import { Pill, ShieldCheck } from "lucide-react";

import type { ProductType } from "@/data/products";
import { cn } from "@/lib/utils";

/**
 * Consistent OTC vs Prescription (Rx) signal used across catalog and detail.
 * Rx wears the reserved indigo --rx token so a prescription never reads as just
 * more brand teal; OTC stays a quiet neutral pill. Color is never the only
 * signal — both carry text + icon.
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
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isRx
          ? "bg-rx/10 text-rx"
          : "bg-secondary text-secondary-foreground",
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
