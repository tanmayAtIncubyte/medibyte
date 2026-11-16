"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Change this to relabel the marker. Deliberately a plain constant (not config
// or a DB value) so it's trivial to edit.
const TEST_APP_LABEL = "Test app — not a real pharmacy";

// Small red "this is a test app" marker pinned top-right on every page. It's
// dismissible, but reappears on every navigation — the dismissal is
// intentionally NOT persisted, so a fresh page always shows it again.
//
// App Router uses soft navigation and does not remount the root layout, so we
// reset visibility whenever the pathname changes rather than relying on a
// remount.
export function TestAppTile() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [pathname]);

  if (dismissed) {
    return null;
  }

  return (
    <div className="fixed right-3 top-20 z-40 flex items-center gap-2 rounded-full border border-red-700/40 bg-red-600 px-3 py-1 text-xs font-medium text-white shadow-md">
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-white/90" aria-hidden />
      <span>{TEST_APP_LABEL}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss test-app notice"
        className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <X className="size-3" aria-hidden />
      </button>
    </div>
  );
}
