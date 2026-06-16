import { CheckCircle2, Clock, Truck } from "lucide-react";

import type { OrderStatus } from "@/lib/orders/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; Icon: typeof Clock }
> = {
  processing: {
    label: "Processing",
    className: "bg-secondary text-secondary-foreground",
    Icon: Clock,
  },
  shipped: {
    label: "Shipped",
    className: "bg-primary/10 text-primary",
    Icon: Truck,
  },
  delivered: {
    label: "Delivered",
    className: "bg-primary/15 text-primary",
    Icon: CheckCircle2,
  },
};

/** Order status pill — text + icon (color is never the sole signal). */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, className: tone, Icon } = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
