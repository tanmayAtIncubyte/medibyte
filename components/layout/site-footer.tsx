import { Wordmark } from "@/components/brand/logo";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-footer text-footer-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <Wordmark tone="dark" label={brand.name} className="h-8 w-auto" />
        <p className="mt-3 max-w-md text-sm leading-relaxed text-footer-foreground/70">
          {brand.tagline}
        </p>
        <div className="mt-8 border-t border-footer-foreground/15 pt-6 text-sm text-footer-foreground/60">
          &copy; {new Date().getFullYear()} {brand.name}. For assessment use only — not a
          real pharmacy.
        </div>
      </div>
    </footer>
  );
}
