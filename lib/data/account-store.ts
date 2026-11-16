import { seedAccountFor } from "@/data/accounts";
import { currentScope, scopeTtlSeconds } from "@/lib/access/scope";
import { backend } from "@/lib/data/backend";
import type { AccountState } from "@/lib/account/types";

// Per-user account state, keyed by userId in the async KV seam
// (lib/data/backend.ts) under `${scope}:account:<userId>` — scoped so a
// candidate's account edits are isolated and expire with their access window.
// Locally the in-memory backend resets on restart back to the seed account
// state; on the deploy (Redis) an edit made via the /api/account route handler
// is visible to the /account server-component render on a different lambda. No
// DB. On first access a user's state is lazily initialized from their seed (a
// copy, so edits never mutate the seed module).

function accountKey(scope: string, userId: string): string {
  return `${scope}:account:${userId}`;
}

function addressSeqKey(scope: string, userId: string): string {
  return `${scope}:account:addrseq:${userId}`;
}

export async function getAccountState(userId: string): Promise<AccountState> {
  const scope = await currentScope();
  const existing = await backend().get<AccountState>(accountKey(scope, userId));
  if (existing) {
    return existing;
  }
  const seeded = seedAccountFor(userId);
  await backend().set(accountKey(scope, userId), seeded, scopeTtlSeconds(scope));
  return seeded;
}

export async function setAccountState(userId: string, state: AccountState): Promise<void> {
  const scope = await currentScope();
  await backend().set(accountKey(scope, userId), state, scopeTtlSeconds(scope));
}

/** Next sequence for a user's newly-added address id. */
export async function nextAddressSequence(userId: string): Promise<number> {
  const scope = await currentScope();
  const current = (await backend().get<number>(addressSeqKey(scope, userId))) ?? 0;
  const next = current + 1;
  await backend().set(addressSeqKey(scope, userId), next, scopeTtlSeconds(scope));
  return next;
}

export async function resetAccounts(): Promise<void> {
  const scope = await currentScope();
  // Address-sequence keys share the `account:` prefix, so one sweep clears both.
  const keys = await backend().listKeys(`${scope}:account:`);
  for (const key of keys) {
    await backend().del(key);
  }
}
