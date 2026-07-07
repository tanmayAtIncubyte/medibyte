import { NextResponse } from "next/server";

import { hasRedisEnv } from "@/lib/data/backend-redis";

// Unauthenticated health/config check — booleans only, never secret VALUES.
// Lets an operator confirm the deployment actually picked up its environment
// (Redis wiring + session secret) without shelling into Vercel. On the allowlist
// so it's reachable whether or not the access gate is enabled.
export function GET(): NextResponse {
  return NextResponse.json({
    ok: true,
    // Redis configured → per-candidate persistence + the access gate are active.
    redisEnv: hasRedisEnv(),
    // A real secret is set (vs. the insecure dev fallback).
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
  });
}
