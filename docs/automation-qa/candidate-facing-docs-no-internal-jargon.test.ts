import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guards the spec's hard constraint: every candidate-facing doc in this
// directory (the flow/test-case catalog and the three tiered assignment
// briefs) must never leak internal bug-flag vocabulary (flag keys, the
// runbook, the answer key) — those are reviewer-only per CLAUDE.md. A future
// edit that pastes in a bug key or references the runbook/answer key should
// fail this test.

const docFileNames = [
  "flows-and-test-cases.md",
  "assignment-easy.md",
  "assignment-medium.md",
  "assignment-hard.md",
];

describe.each(docFileNames)("%s", (fileName) => {
  const docText = readFileSync(
    path.join(__dirname, fileName),
    "utf-8",
  );

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
