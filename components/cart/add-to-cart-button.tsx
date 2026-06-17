"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Client add-to-cart control. Posts the mutation to the inspectable
 * /api/session/cart endpoint, then refreshes the server-rendered tree so the
 * header count and any cart view update.
 */
export function AddToCartButton({
  productId,
  disabled = false,
  size = "lg",
}: {
  productId: string;
  disabled?: boolean;
  size?: "default" | "sm" | "lg";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setError(null);
    try {
      const response = await fetch("/api/session/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!response.ok) {
        throw new Error("Add to cart failed");
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't add to cart. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        size={size}
        onClick={handleAdd}
        disabled={disabled || pending}
        aria-label="Add to cart"
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : added ? (
          <Check aria-hidden />
        ) : (
          <ShoppingCart aria-hidden />
        )}
        {added ? "Added" : "Add to cart"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
