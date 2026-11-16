"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AppliedCouponView = {
  code: string;
  description: string;
};

/**
 * Coupon apply/remove form. Mutations go through the inspectable
 * /api/session/coupon endpoint; on success the server tree is refreshed so the
 * totals breakdown (discount line + total) recomputes.
 *
 * A11Y_INPUT_NO_LABEL: when `noLabel` is set, the coupon code input loses its
 * programmatic label association (no `<label htmlFor>`, no `aria-label`), so it
 * has no accessible name. The cart page resolves the flag (it has the user) and
 * passes the boolean in, keeping this component clean for admins.
 */
export function CouponForm({
  applied,
  noLabel = false,
}: {
  applied: AppliedCouponView | null;
  noLabel?: boolean;
}) {
  const router = useRouter();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/session/coupon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Couldn't apply that code.");
      return;
    }
    setCode("");
    startTransition(() => router.refresh());
  }

  async function remove() {
    setError(null);
    await fetch("/api/session/coupon", { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  if (applied) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Tag className="size-4" aria-hidden />
            {applied.code}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={pending}
            aria-label={`Remove coupon ${applied.code}`}
          >
            <X aria-hidden />
            Remove
          </Button>
        </div>
        <p className="mt-1 text-xs text-primary/80">{applied.description}</p>
      </div>
    );
  }

  const codeField = (
    <div className="flex gap-2">
      <Input
        name="code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="e.g. SAVE10"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <Button type="submit" variant="outline" disabled={pending || !code.trim()}>
        Apply
      </Button>
    </div>
  );

  return (
    <form onSubmit={apply} className="space-y-2" noValidate>
      {/* Tier 1 (locator-hardening): implicit label-wrapping when noLabel is false; the
          aria-describedby link uses useId() instead of a guessable literal string. */}
      {noLabel ? (
        codeField
      ) : (
        <label className="block text-sm font-medium text-foreground">
          Coupon code
          <div className="mt-1.5">{codeField}</div>
        </label>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
