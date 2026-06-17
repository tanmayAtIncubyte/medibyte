import { findUserByEmail } from "@/lib/data/users";
import type { SeedUser } from "@/data/users";
import {
  addRegisteredCustomer,
  findRegisteredByEmail,
} from "@/lib/data/registrations";
import type { SessionPayload } from "@/lib/auth/session";

// The shape server code consumes — never includes the password.
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: SeedUser["role"];
};

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`An account already exists for ${email}`);
    this.name = "DuplicateEmailError";
  }
}

function findAccountByEmail(email: string): SeedUser | null {
  return findUserByEmail(email) ?? findRegisteredByEmail(email);
}

function toSessionUser(account: SeedUser): SessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };
}

// Phase-1 baseline: plaintext password comparison against the account store.
// Auth itself is clean; security bugs are introduced behind the toggle infra in
// Phase 4. Returns null on unknown email or wrong password — callers must not
// distinguish the two to the client.
export function authenticate(email: string, password: string): SessionUser | null {
  const account = findAccountByEmail(email);
  if (!account || account.password !== password) {
    return null;
  }
  return toSessionUser(account);
}

export function registerCustomer(name: string, email: string, password: string): SessionUser {
  if (findAccountByEmail(email)) {
    throw new DuplicateEmailError(email);
  }
  return toSessionUser(addRegisteredCustomer(name, email, password));
}

export function sessionUserFromPayload(payload: SessionPayload): SessionUser | null {
  const account = findAccountByEmail(payload.email);
  if (!account || account.id !== payload.userId || account.role !== payload.role) {
    return null;
  }
  return toSessionUser(account);
}

export function toSessionPayload(user: SessionUser): SessionPayload {
  return { userId: user.id, email: user.email, role: user.role };
}
