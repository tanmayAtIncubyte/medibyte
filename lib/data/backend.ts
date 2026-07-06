// Async KV seam in front of ALL mutable runtime state (carts, orders, stock,
// registrations, account edits).
//
// Why: the deployed instance runs on Vercel, where each request may hit a
// different stateless lambda — plain in-process Maps don't persist (add-to-cart
// returns 201 but the cart renders empty). The seam lets local dev + Vitest
// keep the offline in-memory store while the deploy uses Upstash Redis
// (env-detected), so state survives across lambdas.
//
// Values are JSON-serializable. `ttlSeconds` lets candidate-scoped state
// expire together with the candidate's access window (see lib/access/scope.ts).

import { createRedisBackend, hasRedisEnv } from "@/lib/data/backend-redis";
import { globalSingleton } from "@/lib/data/global-store";

export interface KvBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** All live keys starting with `prefix`. */
  listKeys(prefix: string): Promise<string[]>;
}

type Entry = { json: string; expiresAt: number | null };

/**
 * Offline in-memory backend (local dev + tests). TTL is honored lazily: an
 * expired entry is treated as absent (and dropped) on the next read.
 */
export function createInMemoryBackend(
  store: Map<string, Entry> = new Map(),
): KvBackend {
  function live(key: string): Entry | null {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = live(key);
      return entry ? (JSON.parse(entry.json) as T) : null;
    },
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      store.set(key, {
        json: JSON.stringify(value),
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },
    async del(key: string): Promise<void> {
      store.delete(key);
    },
    async listKeys(prefix: string): Promise<string[]> {
      return [...store.keys()].filter(
        (key) => key.startsWith(prefix) && live(key) !== null,
      );
    },
  };
}

/**
 * The process-wide backend. Env-detected: Upstash Redis when configured (the
 * deploy), otherwise in-memory (local dev + tests). Selection happens here so
 * no caller ever branches on environment.
 */
export function backend(): KvBackend {
  return globalSingleton("kv/backend", () => {
    if (hasRedisEnv()) {
      return createRedisBackend();
    }
    return createInMemoryBackend();
  });
}
