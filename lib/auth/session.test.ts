import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import {
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/session";

// Slice 4 — the security core. The session cookie is a hand-rolled HMAC-signed
// token: base64url(json(payload)).base64url(hmac-sha256). These tests exercise
// AC 5 (signed, integrity-protected token) and AC 6 (tampering invalidates the
// session rather than impersonating a user). verifySession must NEVER throw and
// NEVER return a payload for a value whose signature does not verify.

const SECRET = "test-secret-key";
const OTHER_SECRET = "a-completely-different-secret";

const adminPayload: SessionPayload = {
  userId: "user-admin",
  email: "admin@medibyte.test",
  role: "admin",
};

const customerPayload: SessionPayload = {
  userId: "user-customer-dana",
  email: "dana@example.test",
  role: "customer",
};

const qaAutomationPayload: SessionPayload = {
  userId: "user-qa-steve",
  email: "steve@example.test",
  role: "qa_automation",
};

// Mirrors the production signing so tests can forge "valid-looking" parts.
function encodePayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function hmacOf(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

describe("signSession / verifySession round-trip", () => {
  it("recovers the exact admin payload that was signed", () => {
    const token = signSession(adminPayload, SECRET);

    expect(verifySession(token, SECRET)).toEqual(adminPayload);
  });

  it("recovers the exact customer payload that was signed", () => {
    const token = signSession(customerPayload, SECRET);

    expect(verifySession(token, SECRET)).toEqual(customerPayload);
  });

  // Slice 1 (Phase 6): the role allowlist widened to accept qa_automation —
  // this locks in the fix for the "guaranteed breakage point" the spec flags.
  it("recovers the exact qa_automation payload that was signed", () => {
    const token = signSession(qaAutomationPayload, SECRET);

    expect(verifySession(token, SECRET)).toEqual(qaAutomationPayload);
  });

  it("preserves the role claim through a round-trip", () => {
    const token = signSession(customerPayload, SECRET);

    expect(verifySession(token, SECRET)?.role).toBe("customer");
  });

  it("produces a two-part token joined by a single dot", () => {
    const token = signSession(adminPayload, SECRET);

    expect(token.split(".")).toHaveLength(2);
  });
});

describe("verifySession rejects a wrong secret (no cross-secret impersonation)", () => {
  it("returns null when verifying with a different secret than was used to sign", () => {
    const token = signSession(adminPayload, SECRET);

    expect(verifySession(token, OTHER_SECRET)).toBeNull();
  });

  it("does not let a token signed under one secret verify under another", () => {
    const tokenA = signSession(adminPayload, SECRET);
    const tokenB = signSession(adminPayload, OTHER_SECRET);

    // Same payload, different signatures — each only verifies under its own secret.
    expect(verifySession(tokenA, OTHER_SECRET)).toBeNull();
    expect(verifySession(tokenB, SECRET)).toBeNull();
  });
});

describe("verifySession rejects signature tampering", () => {
  it("returns null when the signature is replaced with garbage", () => {
    const [encodedPayload] = signSession(adminPayload, SECRET).split(".");

    expect(verifySession(`${encodedPayload}.deadbeef`, SECRET)).toBeNull();
  });

  it("returns null when the signature is emptied", () => {
    const [encodedPayload] = signSession(adminPayload, SECRET).split(".");

    expect(verifySession(`${encodedPayload}.`, SECRET)).toBeNull();
  });

  it("returns null when a single character of the signature is flipped", () => {
    const [encodedPayload, signature] = signSession(adminPayload, SECRET).split(".");
    const flipped =
      (signature[0] === "A" ? "B" : "A") + signature.slice(1);

    expect(verifySession(`${encodedPayload}.${flipped}`, SECRET)).toBeNull();
  });

  it("returns null when a valid signature from a different payload is reused", () => {
    const customerSig = signSession(customerPayload, SECRET).split(".")[1];
    const adminEncoded = signSession(adminPayload, SECRET).split(".")[0];

    // Splicing an admin payload onto a customer's signature must not verify.
    expect(verifySession(`${adminEncoded}.${customerSig}`, SECRET)).toBeNull();
  });
});

describe("verifySession rejects payload tampering (privilege escalation guard)", () => {
  it("returns null when the payload is mutated to claim admin but keeps an old signature", () => {
    const token = signSession(customerPayload, SECRET);
    const originalSignature = token.split(".")[1];
    const escalatedPayload = encodePayload({
      ...customerPayload,
      role: "admin",
    });

    // Customer flips their own role to admin; the signature no longer matches.
    expect(
      verifySession(`${escalatedPayload}.${originalSignature}`, SECRET),
    ).toBeNull();
  });

  it("returns null when the payload bytes are altered after signing", () => {
    const token = signSession(customerPayload, SECRET);
    const [encodedPayload, signature] = token.split(".");
    const mutated =
      (encodedPayload[0] === "Z" ? "Y" : "Z") + encodedPayload.slice(1);

    expect(verifySession(`${mutated}.${signature}`, SECRET)).toBeNull();
  });

  it("returns null for a forged payload re-signed under an attacker secret", () => {
    // Attacker who does not know the real secret cannot mint a valid admin token.
    const forgedPayload = encodePayload({ ...customerPayload, role: "admin" });
    const forgedSignature = hmacOf(forgedPayload, OTHER_SECRET);

    expect(
      verifySession(`${forgedPayload}.${forgedSignature}`, SECRET),
    ).toBeNull();
  });
});

describe("verifySession rejects malformed values without throwing", () => {
  const malformed: Array<[string, string | null | undefined]> = [
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["no separator dot", "justonepart"],
    ["only a dot", "."],
    ["three parts (extra dot)", "a.b.c"],
    ["non-base64url payload", "!!!notbase64!!!.somesig"],
  ];

  it.each(malformed)("returns null for %s", (_label, value) => {
    expect(() => verifySession(value, SECRET)).not.toThrow();
    expect(verifySession(value, SECRET)).toBeNull();
  });

  it("returns null for a truncated token (payload only, no signature part)", () => {
    const encodedPayload = signSession(adminPayload, SECRET).split(".")[0];

    expect(verifySession(encodedPayload, SECRET)).toBeNull();
  });

  it("returns null when the payload decodes to JSON missing required fields", () => {
    const incomplete = encodePayload({ userId: "x" });
    const signature = hmacOf(incomplete, SECRET);

    // Even with a structurally valid signature, an unexpected payload shape is rejected.
    expect(verifySession(`${incomplete}.${signature}`, SECRET)).toBeNull();
  });

  it("returns null when the payload carries an unknown role", () => {
    const badRole = encodePayload({
      userId: "user-x",
      email: "x@example.test",
      role: "superuser",
    });
    const signature = hmacOf(badRole, SECRET);

    expect(verifySession(`${badRole}.${signature}`, SECRET)).toBeNull();
  });

  it("returns null when the payload is valid JSON but not an object", () => {
    const notObject = Buffer.from('"a string"', "utf8").toString("base64url");
    const signature = hmacOf(notObject, SECRET);

    expect(verifySession(`${notObject}.${signature}`, SECRET)).toBeNull();
  });
});
