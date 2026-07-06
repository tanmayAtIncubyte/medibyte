import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryBackend } from "@/lib/data/backend";

// The KV seam every store module writes through. These tests pin the contract
// the stores rely on: JSON roundtrip, prefix listing, and lazy TTL expiry (an
// expired entry is simply absent — the candidate-scope reaper).

describe("createInMemoryBackend", () => {
  it("roundtrips a JSON value through set/get", async () => {
    const kv = createInMemoryBackend();
    await kv.set("main:sess:s1", { cart: [{ productId: "p1", quantity: 2 }] });

    expect(await kv.get("main:sess:s1")).toEqual({
      cart: [{ productId: "p1", quantity: 2 }],
    });
  });

  it("returns null for a key that was never set", async () => {
    const kv = createInMemoryBackend();
    expect(await kv.get("main:sess:missing")).toBeNull();
  });

  it("returns a detached copy: mutating a read result does not corrupt the store", async () => {
    const kv = createInMemoryBackend();
    await kv.set("main:stock:reserved", { p1: 3 });

    const first = await kv.get<Record<string, number>>("main:stock:reserved");
    first!.p1 = 999;

    expect(await kv.get("main:stock:reserved")).toEqual({ p1: 3 });
  });

  it("overwrites an existing value on set", async () => {
    const kv = createInMemoryBackend();
    await kv.set("main:orders:seq:u1", 1);
    await kv.set("main:orders:seq:u1", 2);

    expect(await kv.get("main:orders:seq:u1")).toBe(2);
  });

  it("deletes a key", async () => {
    const kv = createInMemoryBackend();
    await kv.set("main:reg:a@b.test", { id: "u1" });
    await kv.del("main:reg:a@b.test");

    expect(await kv.get("main:reg:a@b.test")).toBeNull();
  });

  it("lists only the live keys under a prefix", async () => {
    const kv = createInMemoryBackend();
    await kv.set("main:sess:a", 1);
    await kv.set("main:sess:b", 2);
    await kv.set("main:orders:list", []);
    await kv.set("cand:pat:sess:c", 3);

    expect((await kv.listKeys("main:sess:")).sort()).toEqual([
      "main:sess:a",
      "main:sess:b",
    ]);
  });

  describe("TTL expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("treats an entry past its ttl as absent", async () => {
      const kv = createInMemoryBackend();
      vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
      await kv.set("cand:pat:sess:s1", { cart: [] }, 60);

      // Still live just before the deadline...
      vi.setSystemTime(new Date("2026-06-16T00:00:59.000Z"));
      expect(await kv.get("cand:pat:sess:s1")).toEqual({ cart: [] });

      // ...and gone at/after it.
      vi.setSystemTime(new Date("2026-06-16T00:01:00.000Z"));
      expect(await kv.get("cand:pat:sess:s1")).toBeNull();
    });

    it("excludes expired entries from listKeys", async () => {
      const kv = createInMemoryBackend();
      vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
      await kv.set("cand:pat:sess:short", 1, 30);
      await kv.set("cand:pat:sess:forever", 2); // no ttl → never expires

      vi.setSystemTime(new Date("2026-06-16T00:01:00.000Z"));
      expect(await kv.listKeys("cand:pat:sess:")).toEqual([
        "cand:pat:sess:forever",
      ]);
    });
  });
});
