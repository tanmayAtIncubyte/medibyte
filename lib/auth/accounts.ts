import { findUserByEmail } from "@/lib/data/users";
import type { SeedUser } from "@/data/users";
import {
  addRegisteredCustomer,
  findRegisteredByEmail,
} from "@/lib/data/registrations";
import type { SessionPayload } from "@/lib/auth/session";
import { backend } from "@/lib/data/backend";

// The admin password can be rotated WITHOUT a code change: it's resolved at
// login from the `admin:password` key in the KV store (Redis on the deploy),
// then the ADMIN_PASSWORD env var, then the seed default in data/users.ts.
// Only the admin account uses this override; customer passwords stay in the
// seed / registration store.
export const ADMIN_PASSWORD_KEY = "admin:password";

async function resolveAdminPassword(seedPassword: string): Promise<string> {
  const fromDb = await backend().get<string>(ADMIN_PASSWORD_KEY);
  if (typeof fromDb === "string" && fromDb.length > 0) {
    return fromDb;
  }
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return seedPassword;
}

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

async function findAccountByEmail(email: string): Promise<SeedUser | null> {
  return findUserByEmail(email) ?? (await findRegisteredByEmail(email));
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
export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const account = await findAccountByEmail(email);
  if (!account) {
    return null;
  }
  const expected =
    account.role === "admin"
      ? await resolveAdminPassword(account.password)
      : account.password;
  if (expected !== password) {
    return null;
  }
  return toSessionUser(account);
}

export async function registerCustomer(
  name: string,
  email: string,
  password: string,
): Promise<SessionUser> {
  if (await findAccountByEmail(email)) {
    throw new DuplicateEmailError(email);
  }
  return toSessionUser(await addRegisteredCustomer(name, email, password));
}

export async function sessionUserFromPayload(
  payload: SessionPayload,
): Promise<SessionUser | null> {
  const account = await findAccountByEmail(payload.email);
  if (!account || account.id !== payload.userId || account.role !== payload.role) {
    return null;
  }
  return toSessionUser(account);
}

export function toSessionPayload(user: SessionUser): SessionPayload {
  return { userId: user.id, email: user.email, role: user.role };
}
