import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { CtaChip } from "@/components/ui/cta-chip";
import { getCartView } from "@/lib/cart/cart-service";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";
import { readSessionIdFromCookies } from "@/lib/data/session-id";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const sessionId = await readSessionIdFromCookies();
  const cart = sessionId ? await getCartView(sessionId) : null;
  // FN_CART_BADGE_LINES: count distinct line items instead of total quantity.
  // Flag is resolved here (the user lives in the header) and never for admin.
  const badgeCountsLines = isBugActive("FN_CART_BADGE_LINES", user);
  const cartCount = cart
    ? badgeCountsLines
      ? cart.lines.length
      : cart.itemCount
    : 0;

  return (
    // A floating white pill that rides over the mint page, inset from the
    // viewport edges — Incubyte's nav treatment. The nav is grouped rather than
    // a flat row: shopping, then who-you-are, then admin, split by hairlines.
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 rounded-full border border-border/70 bg-card pl-5 pr-2 shadow-[0_8px_30px_rgba(1,77,67,0.08)]">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Primary">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">Browse</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/cart"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            >
              <ShoppingCart aria-hidden />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <>
              <span aria-hidden className="mx-1.5 h-5 w-px shrink-0 bg-border" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">Orders</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Account</Link>
              </Button>
              {user.role === "admin" && (
                <>
                  <span aria-hidden className="mx-1.5 h-5 w-px shrink-0 bg-border" />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin">Admin</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/candidates">Candidates</Link>
                  </Button>
                </>
              )}
              <span className="ml-2 hidden text-sm text-muted-foreground sm:inline">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <CtaChip size="sm" />
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
