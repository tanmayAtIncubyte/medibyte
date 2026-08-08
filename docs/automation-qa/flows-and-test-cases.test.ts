import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guards the spec's hard constraint: this candidate-adjacent catalog doc must
// never leak internal bug-flag vocabulary (flag keys, the runbook, the answer
// key) — those are reviewer-only per CLAUDE.md. A future edit that pastes in
// a bug key or references the runbook/answer key should fail this test.

const docPath = path.join(__dirname, "flows-and-test-cases.md");
const docText = readFileSync(docPath, "utf-8");

describe("flows-and-test-cases.md", () => {
  it("never mentions the bug-gating mechanism or its call", () => {
    expect(docText).not.toMatch(/isBugActive/i);
    expect(docText).not.toMatch(/bug[-_ ]?flags?/i);
  });

  it("never mentions the admin runbook or answer key", () => {
    expect(docText).not.toMatch(/runbook/i);
    expect(docText).not.toMatch(/answer[-_ ]?key/i);
  });

  it("never mentions a bug-registry key identifier", () => {
    expect(docText).not.toMatch(
      /\b(FN|SEC|A11Y|PERF|UI|UX)_[A-Z0-9_]+\b/,
    );
  });
});
