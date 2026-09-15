"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CtaChip } from "@/components/ui/cta-chip";
import { cn } from "@/lib/utils";

/**
 * `tone="onPanel"` renders the white-pill treatment used on the dark green
 * promo panel; the default is the green pill used on the mint page. Visual
 * only — the behaviour is identical either way.
 */
export function RefillReminder({
  tone = "default",
}: {
  tone?: "default" | "onPanel";
}) {
  const [reminding, setReminding] = useState(false);
  const onPanel = tone === "onPanel";

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <span className="inline-flex items-center gap-1">
        <Button
          size="lg"
          onClick={() => setReminding(true)}
          className={cn(
            onPanel && "bg-card text-primary hover:bg-card/90",
          )}
        >
          {reminding ? "Reminder set" : "Set a refill reminder"}
        </Button>
        <CtaChip />
      </span>
      {reminding ? (
        <p
          role="status"
          className={cn(
            "text-sm",
            onPanel ? "text-panel-foreground/80" : "text-muted-foreground",
          )}
        >
          We&apos;ll nudge you before your next refill is due.
        </p>
      ) : null}
    </div>
  );
}
