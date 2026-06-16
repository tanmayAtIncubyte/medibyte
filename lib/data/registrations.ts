import { randomUUID } from "crypto";

import type { SeedUser } from "@/data/users";

// In-memory store for customers created via /register, kept separate from the
// seed module so the deterministic seed data is never mutated. Like the cart
// store, these writes live for the server process lifetime and reset on restart,
// consistent with the data layer's in-memory write pattern.
const registeredCustomers = new Map<string, SeedUser>();

export function findRegisteredByEmail(email: string): SeedUser | null {
  const normalized = email.trim().toLowerCase();
  const user = registeredCustomers.get(normalized);
  return user ? { ...user } : null;
}

export function addRegisteredCustomer(name: string, email: string, password: string): SeedUser {
  const normalized = email.trim().toLowerCase();
  const customer: SeedUser = {
    id: `user-registered-${randomUUID()}`,
    name,
    email: normalized,
    password,
    role: "customer",
  };
  registeredCustomers.set(normalized, customer);
  return { ...customer };
}

export function resetRegistrations(): void {
  registeredCustomers.clear();
}
