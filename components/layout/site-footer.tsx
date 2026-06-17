import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
        &copy; {new Date().getFullYear()} {brand.name}. For assessment use only — not a real pharmacy.
      </div>
    </footer>
  );
}
