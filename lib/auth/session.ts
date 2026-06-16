import { createHmac, timingSafeEqual } from "crypto";

import type { UserRole } from "@/data/users";

// The signed claims carried by the session cookie. Kept compact and limited to
// what server code needs to identify the user and gate behavior. The role is
// NEVER trusted unless the HMAC verifies (see verifySession).
export type SessionPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

// Cookie value format: base64url(json(payload)).base64url(hmac). The two parts
// are joined by a single ".", which never appears in base64url output, so the
// split is unambiguous.
const PART_SEPARATOR = ".";

export function signSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}${PART_SEPARATOR}${signature}`;
}

// Returns the payload only when the value is well-formed AND its HMAC verifies
// with a timing-safe comparison. Any tampering, malformed input, or signature
// mismatch returns null — it never throws and never trusts an unverified claim.
export function verifySession(value: string | null | undefined, secret: string): SessionPayload | null {
  if (!value) {
    return null;
  }
  const parts = value.split(PART_SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = sign(encodedPayload, secret);
  if (!signaturesMatch(providedSignature, expectedSignature)) {
    return null;
  }
  return parsePayload(encodedPayload);
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function signaturesMatch(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

function parsePayload(encodedPayload: string): SessionPayload | null {
  try {
    const decoded = JSON.parse(decodeBase64Url(encodedPayload)) as unknown;
    return isSessionPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "admin" || candidate.role === "customer")
  );
}

function encodeBase64Url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

function decodeBase64Url(text: string): string {
  return Buffer.from(text, "base64url").toString("utf8");
}
