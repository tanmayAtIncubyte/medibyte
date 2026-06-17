"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function RefillReminder() {
  const [reminding, setReminding] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <Button size="lg" onClick={() => setReminding(true)}>
        {reminding ? "Reminder set" : "Set a refill reminder"}
      </Button>
      {reminding ? (
        <p role="status" className="text-sm text-muted-foreground">
          We&apos;ll nudge you before your next refill is due.
        </p>
      ) : null}
    </div>
  );
}
