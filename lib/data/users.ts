import { users, type SeedUser } from "@/data/users";

export function listUsers(): SeedUser[] {
  return users.map((user) => ({ ...user }));
}

export function findUserByEmail(email: string): SeedUser | null {
  const normalized = email.trim().toLowerCase();
  const user = users.find((candidate) => candidate.email.toLowerCase() === normalized);
  return user ? { ...user } : null;
}
