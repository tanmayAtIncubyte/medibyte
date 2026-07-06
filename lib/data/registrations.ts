import { randomUUID } from "crypto";

import type { SeedUser } from "@/data/users";
import { currentScope, scopeTtlSeconds } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";

// Store for customers created via /register, kept separate from the seed
// module so the deterministic seed data is never mutated. Registrations live in
// the async KV seam (lib/data/backend.ts) under `${scope}:reg:<email>` — scoped
// so a candidate's registrations are isolated and expire with their access
// window. Locally the in-memory backend resets on restart, consistent with the
// data layer's in-memory write pattern; on the deploy (Redis) a registration
// created via the /api/auth/register route handler is visible to
// server-component reads on other lambdas.

function regKey(scope: string, normalizedEmail: string): string {
  return `${scope}:reg:${normalizedEmail}`;
}

export async function findRegisteredByEmail(email: string): Promise<SeedUser | null> {
  const scope = await currentScope();
  const normalized = email.trim().toLowerCase();
  const user = await backend().get<SeedUser>(regKey(scope, normalized));
  return user ? { ...user } : null;
}

export async function addRegisteredCustomer(
  name: string,
  email: string,
  password: string,
): Promise<SeedUser> {
  const scope = await currentScope();
  const normalized = email.trim().toLowerCase();
  const customer: SeedUser = {
    id: `user-registered-${randomUUID()}`,
    name,
    email: normalized,
    password,
    role: "customer",
  };
  await backend().set(regKey(scope, normalized), customer, scopeTtlSeconds(scope));
  return { ...customer };
}

export async function resetRegistrations(): Promise<void> {
  const scope = await currentScope();
  const keys = await backend().listKeys(`${scope}:reg:`);
  for (const key of keys) {
    await backend().del(key);
  }
}
