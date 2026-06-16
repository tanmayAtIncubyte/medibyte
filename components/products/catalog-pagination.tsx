import Link from "next/link";

import { buildCatalogHref } from "@/lib/catalog/params";
import type { CatalogQuery } from "@/lib/catalog/query";
import { cn } from "@/lib/utils";

/**
 * Server-rendered, URL-driven pagination. Each control is a <Link> that
 * preserves the active search/filter/sort and only changes the page.
 */
export function CatalogPagination({
  query,
  page,
  totalPages,
}: {
  query: CatalogQuery;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      <PageLink
        href={buildCatalogHref(query, { page: page - 1 })}
        disabled={!hasPrev}
        label="Previous page"
      >
        Prev
      </PageLink>

      {pages.map((p) => (
        <Link
          key={p}
          href={buildCatalogHref(query, { page: p })}
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            p === page
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {p}
        </Link>
      ))}

      <PageLink
        href={buildCatalogHref(query, { page: page + 1 })}
        disabled={!hasNext}
        label="Next page"
      >
        Next
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition-colors";
  if (disabled) {
    return (
      <span
        aria-disabled
        className={cn(className, "pointer-events-none opacity-40")}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        className,
        "bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {children}
    </Link>
  );
}
