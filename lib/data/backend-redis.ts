// Upstash Redis implementation of the KV seam (the deployed instance).
//
// Uses the REST client, so it works from any runtime (lambda, middleware) with
// no connection pooling to manage. JSON encoding is done HERE (automatic
// deserialization is off) so the contract is byte-identical to the in-memory
// backend: values roundtrip through JSON, reads are detached copies, and TTL
// is native Redis `EX` — candidate-scoped state genuinely self-destructs when
// the access window lapses.

import { Redis } from "@upstash/redis";

import type { KvBackend } from "@/lib/data/backend";

export function hasRedisEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function createRedisBackend(redis?: Redis): KvBackend {
  const client =
    redis ??
    new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      automaticDeserialization: false,
    });

  return {
    async get<T>(key: string): Promise<T | null> {
      const json = await client.get<string>(key);
      return json === null || json === undefined
        ? null
        : (JSON.parse(json) as T);
    },
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const json = JSON.stringify(value);
      if (ttlSeconds) {
        await client.set(key, json, { ex: ttlSeconds });
      } else {
        await client.set(key, json);
      }
    },
    async del(key: string): Promise<void> {
      await client.del(key);
    },
    async listKeys(prefix: string): Promise<string[]> {
      // SCAN (never KEYS) — cursor loop until exhausted. Key counts here are
      // tiny (sessions + a handful of candidate namespaces), so this is cheap.
      const keys: string[] = [];
      let cursor = "0";
      do {
        const [next, batch] = await client.scan(cursor, {
          match: `${prefix}*`,
          count: 200,
        });
        keys.push(...batch);
        cursor = String(next);
      } while (cursor !== "0");
      return keys;
    },
  };
}
