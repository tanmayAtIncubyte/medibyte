import Link from "next/link";

import { cn } from "@/lib/utils";

export type RailItem = {
  label: string;
  href?: string;
  current?: boolean;
  note?: string;
};

/**
 * The wayfinding rail: a quiet index of where you are, set in the page's left
 * gutter. It is purely supplementary — it only appears once the viewport is wide
 * enough for a real gutter to exist, and because it is absolutely positioned it
 * never affects the content column's layout at any width. The parent `<main>`
 * (see PageContainer) is `relative` so the rail hangs off it.
 */
export function PageRail({
  label,
  items,
  footer,
  ordered = false,
}: {
  label: string;
  items: RailItem[];
  footer?: RailItem[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";

  return (
    <nav
      aria-label={label}
      className="absolute -left-[14.5rem] top-3.5 hidden w-[11.5rem] border-l border-border pl-4 text-[0.85rem] leading-snug text-muted-foreground min-[1640px]:block"
    >
      <List className="flex flex-col gap-3.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {ordered && <span className="mr-2 tabular-nums">{index + 1}</span>}
            <RailEntry item={item} />
          </li>
        ))}
      </List>

      {footer && footer.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3.5 border-t border-border pt-4">
          {footer.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <RailEntry item={item} />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function RailEntry({ item }: { item: RailItem }) {
  const note = item.note ? (
    <span className="ml-1.5 font-normal text-muted-foreground">{item.note}</span>
  ) : null;

  if (item.current || !item.href) {
    return (
      <>
        <span className={cn(item.current && "font-semibold text-primary")}>{item.label}</span>
        {note}
      </>
    );
  }

  return (
    <>
      <Link href={item.href} className="text-inherit no-underline hover:text-foreground">
        {item.label}
      </Link>
      {note}
    </>
  );
}
