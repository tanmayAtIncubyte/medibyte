import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between sm:px-6">
        <p className="font-heading text-base font-semibold text-foreground">
          {brand.name}
        </p>
        <p>
          &copy; {new Date().getFullYear()} {brand.name}. For assessment use only — not a
          real pharmacy.
        </p>
      </div>
    </footer>
  );
}
