import { seedAccountFor } from "@/data/accounts";
import { globalSingleton } from "@/lib/data/global-store";
import type { AccountState } from "@/lib/account/types";

// In-memory per-process account state, keyed by userId. Anchored on globalThis
// (globalSingleton) so account edits made via the /api/account route handler are
// visible to the /account server-component render (Next bundles them separately).
// Writes survive for the process lifetime and reset on restart back to the seed
// account state. No DB. On first access a user's state is lazily initialized
// from their seed (a copy, so edits never mutate the seed module).

const accounts = globalSingleton(
  "account-store/accounts",
  () => new Map<string, AccountState>(),
);

// Per-user sequence used to derive stable ids for newly-added addresses.
const addressSequences = globalSingleton(
  "account-store/addressSequences",
  () => new Map<string, number>(),
);

export function getAccountState(userId: string): AccountState {
  const existing = accounts.get(userId);
  if (existing) {
    return existing;
  }
  const seeded = seedAccountFor(userId);
  accounts.set(userId, seeded);
  return seeded;
}

export function setAccountState(userId: string, state: AccountState): void {
  accounts.set(userId, state);
}

/** Next sequence for a user's newly-added address id. */
export function nextAddressSequence(userId: string): number {
  const next = (addressSequences.get(userId) ?? 0) + 1;
  addressSequences.set(userId, next);
  return next;
}

export function resetAccounts(): void {
  accounts.clear();
  addressSequences.clear();
}
