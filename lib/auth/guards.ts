import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { SessionUser } from "@/lib/auth/accounts";

// Page guard: gate any storefront page/layout behind a real session. Redirects
// logged-out visitors to the login page; returns the authenticated user (admin
// OR customer) otherwise. Runs in the Node runtime via getCurrentUser(), so the
// HMAC signature is verified safely (it is NOT edge-middleware compatible).
//
// This is intentionally CLEAN: both roles are allowed through. It is access
// gating, not a seeded bug — no isBugActive paths here.
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Page guard: use in admin server components. Redirects logged-out or non-admin
// visitors to the login page; returns the admin user otherwise.
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }
  return user;
}

// API guard: use in admin route handlers. Returns the admin user, or null when
// access should be denied (caller responds 403). Independent of the page guard
// for defense in depth.
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}
