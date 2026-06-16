"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Per-line quantity stepper + remove control. Mutations go through the
 * inspectable /api/session/cart endpoint (PATCH to set quantity, DELETE to
 * remove); the server tree is refreshed so totals recompute.
 */
export function CartLineControls({
  productId,
  productName,
  quantity,
}: {
  productId: string;
  productName: string;
  quantity: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setQuantity(next: number) {
    await fetch("/api/session/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: next }),
    });
    startTransition(() => router.refresh());
  }

  async function remove() {
    await fetch("/api/session/cart", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex items-center rounded-lg border border-border"
        role="group"
        aria-label={`Quantity for ${productName}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setQuantity(quantity - 1)}
          disabled={pending}
          aria-label={`Decrease quantity of ${productName}`}
        >
          <Minus aria-hidden />
        </Button>
        <span
          className="min-w-8 text-center text-sm font-medium tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setQuantity(quantity + 1)}
          disabled={pending}
          aria-label={`Increase quantity of ${productName}`}
        >
          <Plus aria-hidden />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={remove}
        disabled={pending}
        aria-label={`Remove ${productName} from cart`}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}
