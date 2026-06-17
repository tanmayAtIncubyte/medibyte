// HMAC secret for signing session cookies. In real deployments this MUST be set
// via the SESSION_SECRET environment variable. The dev fallback below exists
// only so local development works out of the box for this assessment app — it
// is intentionally NOT a secret and must never be relied on in production.
const DEV_FALLBACK_SECRET = "medibyte-dev-session-secret-do-not-use-in-prod";

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? DEV_FALLBACK_SECRET;
}
