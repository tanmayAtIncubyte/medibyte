"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Per-line quantity stepper + remove control. Mutations go through the
 * inspectable /api/session/cart endpoint (PATCH to set quantity, DELETE to
 * remove); the server tree is refreshed so totals recompute.
 *
 * A11Y_NO_KEYBOARD_FOCUS: when `noKeyboardFocus` is set, the +/- quantity
 * steppers render as plain clickable <span>s instead of <button>s — they are
 * not in the tab order, cannot be triggered by keyboard, and show no focus ring.
 * The cart page resolves the flag (it has the user) and passes the boolean in,
 * keeping this component keyboard-operable for admins.
 *
 * UI_DESTRUCTIVE_NO_CONFIRM: when `removeWithoutConfirm` is set, clicking Remove
 * deletes the line immediately with no confirmation prompt. Clean default asks
 * for confirmation first. UI_MISLEADING_ICON: when `misleadingRemoveIcon` is
 * set, the destructive Remove button shows a friendly Heart icon (mismatched to
 * the action) instead of the trash can. Both flags are resolved on the cart
 * page (which has the user) and passed in, keeping admins on the correct path.
 */
export function CartLineControls({
  productId,
  productName,
  quantity,
  noKeyboardFocus = false,
  removeWithoutConfirm = false,
  misleadingRemoveIcon = false,
}: {
  productId: string;
  productName: string;
  quantity: number;
  noKeyboardFocus?: boolean;
  removeWithoutConfirm?: boolean;
  misleadingRemoveIcon?: boolean;
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

  async function doRemove() {
    await fetch("/api/session/cart", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    startTransition(() => router.refresh());
  }

  async function remove() {
    // UI_DESTRUCTIVE_NO_CONFIRM: skip the confirmation guard when the bug is on.
    if (removeWithoutConfirm) {
      await doRemove();
      return;
    }
    if (window.confirm(`Remove ${productName} from your cart?`)) {
      await doRemove();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex items-center rounded-lg border border-border"
        role="group"
        aria-label={`Quantity for ${productName}`}
      >
        {noKeyboardFocus ? (
          <span
            onClick={() => !pending && setQuantity(quantity - 1)}
            aria-label={`Decrease quantity of ${productName}`}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),12px)] text-sm outline-none [&_svg]:size-4"
          >
            <Minus aria-hidden />
          </span>
        ) : (
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
        )}
        <span
          className="min-w-8 text-center text-sm font-medium tabular-nums"
          aria-live="polite"
        >
          {quantity}
        </span>
        {noKeyboardFocus ? (
          <span
            onClick={() => !pending && setQuantity(quantity + 1)}
            aria-label={`Increase quantity of ${productName}`}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),12px)] text-sm outline-none [&_svg]:size-4"
          >
            <Plus aria-hidden />
          </span>
        ) : (
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
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={remove}
        disabled={pending}
        aria-label={`Remove ${productName} from cart`}
      >
        {/* UI_MISLEADING_ICON: a Heart icon on a destructive Remove action. */}
        {misleadingRemoveIcon ? <Heart aria-hidden /> : <Trash2 aria-hidden />}
      </Button>
    </div>
  );
}
