import { requireUser } from "@/lib/auth/guards";

// Authenticated storefront gate. Every page in this route group (home,
// products, product detail, cart) renders only for a logged-in user; an
// unauthenticated visitor is redirected to /login. /login and /register live
// OUTSIDE this group and stay reachable while logged out.
//
// Gating runs server-side in the Node runtime (requireUser -> getCurrentUser),
// not in edge middleware, so the HMAC-signed session cookie verifies correctly.
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <>{children}</>;
}
