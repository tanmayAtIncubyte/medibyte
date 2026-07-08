---
name: assess-submission
description: Assess a candidate's MediByte QA submission (bug report / test cases, any format) against the 45-bug answer key AND the Incubyte Test Craftsperson framework. Produces a coverage + craft scorecard with tagged signals and an approximate Test Crafter level. Use when a reviewer points at a candidate's submitted document(s) under submissions/ and wants them evaluated.
---

# Assess a MediByte candidate submission

Grade a candidate's submission on **two axes** — what they found (coverage vs the
seeded bugs) and, more importantly, **how they think and communicate** (craft vs
the Incubyte Test Craftsperson framework). Coverage is an input; craft is the
signal. Output is analysis for the reviewer — **never a hire/no-hire verdict**
(the reviewer decides).

## Input
The reviewer gives a path under `submissions/` — a **single file OR a folder**
(a submission may be several files). Formats: PDF, `.docx`, `.xlsx`/`.csv`,
`.md`/`.txt`, and possibly screenshots. If no path is given, ask for one.
Everything under `submissions/` is gitignored (candidate PII) — never commit it.

## Step 1 — Ingest every file
Read each file the reviewer points at (folder → every file in it). By type:
- **`.md` / `.txt` / `.csv`** → Read directly.
- **`.pdf`** → Read tool (reads PDFs, incl. embedded screenshots; use `pages` for long ones).
- **`.docx`** → extract text: `textutil -convert txt -stdout "<file>"` (macOS), then read the output.
- **`.xlsx`** → convert to CSV, then read. Try, in order: `python3` with `openpyxl`/`pandas`; else `libreoffice --headless --convert-to csv --outdir /tmp "<file>"`; else ask the reviewer to export the sheet as CSV or PDF.
- **images / screenshots** → Read (visual) when provided as evidence.
Assemble the full submission text. If any file can't be read, say so explicitly
rather than guessing its contents.

## Step 2 — Load the grading context
- `docs/ANSWER-KEY.md` — the 45 seeded bugs (trigger / expected / actual / how-to-spot). **Ground truth.**
- `lib/bug-registry.ts` — each bug's `category`, `difficulty`, and `hipaa` flag (for weighting + tagging). The chained HIPAA pair is `SEC_IDOR_ORDER` → `SEC_PHI_OVERFETCH`; the reading tripwire is `FN_TRIPWIRE_COPY`.
- `docs/CANDIDATE-BRIEF.md` — what the candidate was actually asked to do.
- `docs/QA/*` — the Incubyte Test Craftsperson framework: the craft rubric + level definitions. This is the real hiring lens.

## Step 3 — Grade on two axes

**Axis 1 — Coverage (an input, not the score).** Semantically map each finding
the candidate reports to a registry bug (they won't use our keys/titles).
Classify each:
- **True positive** — matches a seeded bug; note the key, category, difficulty, HIPAA.
- **Partial** — found the symptom but the expected-result or root-cause is wrong/vague.
- **False positive** — reported *correct baseline behaviour* as a bug (verify against the answer key). This is a signal in itself.
Then note **misses**, especially the HIPAA chain and the reading tripwire.
Weight harder / HIPAA / security finds above easy eyeball ones. Do **not** reward
raw count — Incubyte explicitly values "clarity and purpose, not coverage metrics."

**Axis 2 — Craft (the real signal).** Assess against `docs/QA`, quoting the
candidate's own words as evidence, across:
- **Quality-Driven Thinking** — expected-vs-actual rigor, severity/priority reasoning, edge cases, non-functional awareness (perf / security / usability / a11y).
- **Communication & bug-report craft** — reproducible steps from a known state, right level of abstraction, explains **impact & why**, not just *what*; clear titles.
- **Domain & risk** — HIPAA/PHI + security/privacy awareness, risk framing, "thinks like an adversary, acts like an advocate" (partners on fixes, not just reports).
- **Test-case craft** — scenarios beyond the planted bugs; designed for clarity/purpose; edge & negative cases.

**Be skeptical and fair.** Don't credit vague or unreproducible claims. Flag
fabricated / unverifiable claims and baseline-as-bug reports. **Do** credit a
genuine issue the candidate found that isn't in our 45 (tag it 💡 interesting) —
finding real problems is exactly the mindset Incubyte wants.

## Step 4 — Output the scorecard (structured markdown)
1. **Header** — candidate name (from the doc / their access record if known), files assessed, any that couldn't be read.
2. **Coverage** — TP / partial / FP counts and an `N/45` (with the weighting caveat); a table `their finding → bug key · category · difficulty · HIPAA · verdict`; notable misses (call out the HIPAA chain + tripwire explicitly).
3. **Craft assessment** — one short judgment per Axis-2 dimension, each backed by a quote from their submission.
4. **Signals** — a bulleted list, every item tagged and quote-backed, using EXACTLY this set:
   - 🟢 **positive** · ⚪ **neutral** · 🔴 **negative** · 💡 **interesting** (clever repro, sharp risk framing, or a real unseeded issue) · 🚩 **red flag** (baseline reported as broken, no repro, fabricated/unverifiable, or a serious craft gap).
5. **Approximate Test Crafter level (L1–L5)** — with rationale grounded in `docs/QA`. Make clear it's an indicative signal from one artifact, not a final rating.
6. **Synthesis** — 2–3 lines: top strengths, top gaps. **No hire/no-hire verdict.**

Then offer to save the scorecard to `submissions/<candidate>/assessment.md`
(gitignored) so it's filed with the submission.

## Guardrails
- Ground every coverage claim in `ANSWER-KEY.md` — do not invent bugs the candidate didn't report or that aren't seeded.
- Ground every craft claim in a direct quote from the submission.
- Use the signal set exactly: positive / neutral / negative / interesting / red flag.
- Never share the answer key, this rubric, or the scorecard with the candidate.
- The output is decision-support for the reviewer, not a hiring decision.
