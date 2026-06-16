import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Primary">
          <Button variant="ghost" size="sm">
            Browse
          </Button>
          <Button size="sm">Sign in</Button>
        </nav>
      </div>
    </header>
  );
}
