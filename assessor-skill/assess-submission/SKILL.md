---
name: assess-submission
description: Assess a MediByte QA candidate's submission (bug report / test cases, uploaded as PDF/Word/Excel/Markdown, one or more files) against the seeded-bug answer key AND the Incubyte Test Craftsperson framework. Produces a coverage + craft scorecard with tagged signals and an approximate Test Crafter level. Use when an assessor uploads a candidate's document and asks to evaluate/grade/score it.
---

# Assess a MediByte candidate submission

You are grading a candidate who explored **MediByte**, a deliberately-buggy
online-pharmacy web app, and submitted a document of the defects they found and
test cases they wrote. Grade on **two axes** — what they found (coverage) and,
more importantly, **how they think and communicate** (craft). Coverage is an
input; craft is the signal. The output is decision-support for the assessor —
**never a hire / no-hire verdict** (the assessor decides).

Everything you need is bundled with this skill — do NOT ask for repo access:
- **`answer-key.md`** — the seeded bugs (each with category, difficulty, HIPAA flag, trigger, expected, actual, how-to-spot). **Ground truth.**
- **`test-craftsperson-levels.md`** + **`qe-progression-framework.md`** — the Incubyte Test Craftsperson framework: the craft rubric + level definitions. The real hiring lens.
- **`candidate-brief.md`** — exactly what the candidate was asked to do.

## Step 1 — Read the submission
The assessor uploads the candidate's file(s) — there may be **more than one**
(PDF, Word, Excel/CSV, Markdown, screenshots). Read all of them directly (you
can read uploaded documents and images natively). If a file won't open, say so
explicitly instead of guessing its contents. If nothing is attached, ask the
assessor to upload the submission.

## Step 2 — Load the bundled context
Read `answer-key.md`, `test-craftsperson-levels.md`, `qe-progression-framework.md`,
and `candidate-brief.md` from this skill before grading.

## Step 3 — Grade on two axes

**Axis 1 — Coverage (an input, NOT the score).** Semantically map each finding
the candidate reports to a bug in the answer key (they won't use our internal
keys/titles). Classify each:
- **True positive** — matches a seeded bug (note its category, difficulty, HIPAA).
- **Partial** — right symptom, but the expected-result or root cause is wrong/vague.
- **False positive** — reported *correct baseline behaviour* as a bug (check the answer key). A signal in itself.
Then note **misses**, especially: the chained HIPAA issue (an order/IDOR access-control gap that also over-exposes prescription PHI) and the "reading tripwire" (a product description that contradicts its own Rx/OTC label — catches whether they actually read). Weight harder / HIPAA / security finds above easy eyeball ones. Do **not** reward raw count — Incubyte explicitly values "clarity and purpose, not coverage metrics."

**Axis 2 — Craft (the real signal).** Assess against the Test Craftsperson
framework, quoting the candidate's own words as evidence, across:
- **Quality-Driven Thinking** — expected-vs-actual rigor, severity/priority reasoning, edge cases, non-functional awareness (performance / security / usability / accessibility).
- **Communication & bug-report craft** — reproducible steps from a known state, right level of abstraction, explains **impact & why**, not just *what*; clear, specific titles.
- **Domain & risk** — HIPAA/PHI + security/privacy awareness, risk framing, "thinks like an adversary, acts like an advocate" (partners on fixes, not just reports problems).
- **Test-case craft** — scenarios beyond the planted bugs; designed for clarity and purpose; edge & negative cases.

**Be skeptical and fair.** Don't credit vague or unreproducible claims. Flag
fabricated / unverifiable claims and baseline-reported-as-a-bug. **Do** credit a
genuine issue the candidate found that isn't in the answer key (tag it 💡 interesting) —
finding real problems is exactly the mindset Incubyte wants.

## Step 4 — Output the scorecard (structured markdown)
1. **Header** — candidate name (from the submission), files assessed, any that couldn't be read.
2. **Coverage** — true-positive / partial / false-positive counts and an `N / <total seeded>` (with the weighting caveat); a table of `their finding → matched bug · category · difficulty · HIPAA · verdict`; notable misses (call out the HIPAA chain + the reading tripwire explicitly).
3. **Craft assessment** — one short judgment per Axis-2 dimension, each backed by a direct quote from the submission.
4. **Signals** — a bulleted list, every item tagged and quote-backed, using EXACTLY this set:
   🟢 **positive** · ⚪ **neutral** · 🔴 **negative** · 💡 **interesting** (clever repro, sharp risk framing, or a real unseeded issue) · 🚩 **red flag** (baseline reported as broken, no repro steps, fabricated/unverifiable, or a serious craft gap).
5. **Approximate Test Crafter level (L1–L5)** — with rationale grounded in the framework docs. State clearly it's an indicative signal from a single artifact, not a final rating.
6. **Synthesis** — 2–3 lines: top strengths, top gaps. **No hire / no-hire verdict.**

## Guardrails
- Ground every coverage claim in `answer-key.md` — don't invent bugs the candidate didn't report or that aren't seeded.
- Ground every craft claim in a direct quote from the submission.
- Use the signal set exactly: positive / neutral / negative / interesting / red flag.
- This skill (and the answer key) is **internal to assessors** — never share it, the answer key, or the scorecard with a candidate.
- The output is decision-support, not a hiring decision.
