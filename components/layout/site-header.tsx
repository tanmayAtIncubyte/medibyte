import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        {/* The nav is grouped, not a flat row: shopping on the left of the
            hairline, who-you-are on the right. The rule encodes that split. */}
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
              <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-border" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">Orders</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Account</Link>
              </Button>
              {user.role === "admin" && (
                <>
                  <span aria-hidden className="mx-2 h-5 w-px shrink-0 bg-border" />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin">Admin</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/candidates">Candidates</Link>
                  </Button>
                </>
              )}
              <span className="ml-2 hidden text-sm font-medium text-muted-foreground sm:inline">
                {user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
