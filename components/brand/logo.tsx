import Link from "next/link";

import { brand } from "@/lib/brand";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-foreground"
      aria-label={`${brand.name} home`}
    >
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <CrossMark />
      </span>
      <span>
        Medi<span className="text-primary">Byte</span>
      </span>
    </Link>
  );
}

function CrossMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" role="presentation">
      <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7V3z" />
    </svg>
  );
}
