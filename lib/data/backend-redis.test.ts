import { afterAll, describe, expect, it } from "vitest";

import { createRedisBackend, hasRedisEnv } from "@/lib/data/backend-redis";

// Contract test against a REAL Upstash instance — runs only when the Redis
// env vars are present (CI/local stay offline; the suite is green either way).
// Mirrors the in-memory contract in backend.test.ts: JSON roundtrip, detached
// reads, del, prefix listing, TTL acceptance. Uses a throwaway key prefix and
// cleans up after itself.

const PREFIX = `contract-test:${process.pid}:`;

describe.skipIf(!hasRedisEnv())("createRedisBackend (live Upstash)", () => {
  const kv = hasRedisEnv() ? createRedisBackend() : null!;

  afterAll(async () => {
    if (!kv) return;
    for (const key of await kv.listKeys(PREFIX)) {
      await kv.del(key);
    }
  });

  it("roundtrips a JSON value through set/get", async () => {
    await kv.set(`${PREFIX}sess:s1`, {
      cart: [{ productId: "p1", quantity: 2 }],
      couponCode: null,
    });

    expect(await kv.get(`${PREFIX}sess:s1`)).toEqual({
      cart: [{ productId: "p1", quantity: 2 }],
      couponCode: null,
    });
  });

  it("returns null for a key that was never set", async () => {
    expect(await kv.get(`${PREFIX}missing`)).toBeNull();
  });

  it("deletes a key", async () => {
    await kv.set(`${PREFIX}gone`, 1);
    await kv.del(`${PREFIX}gone`);

    expect(await kv.get(`${PREFIX}gone`)).toBeNull();
  });

  it("lists only keys under the prefix", async () => {
    await kv.set(`${PREFIX}reg:a@x.test`, { name: "A" });
    await kv.set(`${PREFIX}reg:b@x.test`, { name: "B" });

    const keys = await kv.listKeys(`${PREFIX}reg:`);

    expect(keys.sort()).toEqual([
      `${PREFIX}reg:a@x.test`,
      `${PREFIX}reg:b@x.test`,
    ]);
  });

  it("accepts a TTL on set (candidate-scope expiry)", async () => {
    await kv.set(`${PREFIX}ttl`, "expiring", 60);

    expect(await kv.get(`${PREFIX}ttl`)).toBe("expiring");
  });
});
