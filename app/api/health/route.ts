import { NextResponse } from "next/server";

import { backend } from "@/lib/data/backend";
import { hasRedisEnv } from "@/lib/data/backend-redis";

// Unauthenticated health/config check — booleans + a SANITIZED error only,
// never secret VALUES. Lets an operator confirm the deployment picked up its
// environment AND that the Redis connection actually works, without shelling
// into the host. On the gate allowlist so it's reachable regardless of state.

// Strip anything secret-ish from an error before returning it: full URLs and
// any long token-like run of chars.
function sanitize(message: string): string {
  return message
    .replace(/https?:\/\/[^\s"']+/gi, "<url>")
    .replace(/[A-Za-z0-9_-]{20,}/g, "<redacted>")
    .slice(0, 160);
}

export async function GET(): Promise<NextResponse> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";

  const config = {
    redisEnv: hasRedisEnv(),
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
    // Common paste mistakes that make hasRedisEnv() true but connections fail:
    urlStartsWithHttps: url.startsWith("https://"),
    urlHasQuotes: url.includes('"') || url.includes("'"),
    urlHasWhitespace: url !== url.trim(),
  };

  // Real round-trip: prove reads/writes actually reach Redis.
  let redisOk = false;
  let redisError: string | null = null;
  if (hasRedisEnv()) {
    try {
      const kv = backend();
      await kv.set("health:ping", "ok", 30);
      redisOk = (await kv.get<string>("health:ping")) === "ok";
    } catch (error) {
      redisError = sanitize(
        error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      );
    }
  }

  return NextResponse.json({ ok: true, ...config, redisOk, redisError });
}
