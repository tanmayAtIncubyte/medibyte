import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { SessionUser } from "@/lib/auth/accounts";

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
