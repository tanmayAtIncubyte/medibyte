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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Primary">
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
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">Orders</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Account</Link>
              </Button>
              {user.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">{user.name}</span>
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
