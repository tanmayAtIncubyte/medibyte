# Design: QA Assessment Skills for MediByte (Manual + Automation)

**Date:** 2026-08-26
**Status:** Implemented

## Problem

The MediByte reviewer grades QA candidate submissions by hand. Two submission
tracks exist, and each needs a repeatable, evidence-grounded way to turn a
submission into a scored rubric + hire/no-hire recommendation that *assists*
reviewer judgment (the PRD deliberately rejects a fully automated scoring
engine — these skills are a structured aid, not a replacement).

- **Manual track** — the dana/omar **bug hunt**. Candidates explore the running
  app and report the seeded defects + write test cases that would catch them.
  Ground truth: `lib/bug-registry.ts` (45 seeded bugs) + `docs/ANSWER-KEY.md`.
  Only bugs the reviewer **enabled** for that assessment count.
- **Automation track** — candidates automate **one assigned clean flow** via the
  `steve@example.test` account (which sees the app bug-free) at an experience
  tier. NOT a bug hunt. Ground truth: `docs/automation-qa/flows-and-test-cases.md`
  and the tiered `assignment-*.md` briefs. This track is added by open **PR #1**
  (`feat/automation-qa-track`), not yet merged to `main`.

## Solution

Two self-contained Copilot skills under `.claude/skills/` (matching the existing
`playwright-cli` skill pattern). Each is a single `SKILL.md` with YAML
frontmatter (`name`, `description` = "Use when…" triggering conditions only),
overview, when-to-use, inputs, ground-truth pointers, a weighted rubric table, a
step-by-step procedure, an output report template, and a common-mistakes list.

Input to both = a local path to an already-cloned submission/repo. Output = a
scored rubric + evidence citations + band: **Strong Hire ≥80 / Hire 65-79 /
Borderline 50-64 / No Hire <50** (reviewer may override with rationale).

Both reference ground truth by path rather than duplicating it, so the skills
stay correct as bugs/flows change.

### Skill 1 — `assessing-manual-bug-reports`

Grades a manual submission against the seeded-bug answer key.

- Establish the **enabled set** first (reviewer-supplied keys, else `data/bug-flags.json`
  `true` flags). Disabled bugs are `N-A-disabled`, never misses.
- Classify each candidate report: **Found** / **Partial** / **False Positive**;
  an enabled bug with no report is a **Miss**.
- Rubric (/100): Bug coverage 45 (difficulty-weighted easy=1…expert=4, +1 if
  `hipaa`, Found=full/Partial=half) · Report quality 30 · Test-case quality 15 ·
  Signal/precision 10.

### Skill 2 — `assessing-automation-repo`

Grades an automation repo against the **assigned flow/tier**.

- Identify the flow/tier (reviewer input, else inferred from README/scenarios).
- Rubric (/100): Flow coverage & correctness 25 · Locator strategy vs tier 20 ·
  Assertion quality 15 · Runs-anywhere + reporting 15 · Async/wait handling 10 ·
  BDD structure 10 · Code quality & git hygiene 5.
- **Security guard (prominent):** candidate code is untrusted. The skill must not
  auto-run `install`/tests without explicit reviewer consent; grade "runs green"
  from a supervised run, a provided report artifact, or static evidence — never
  by blindly executing candidate code.

## Validation

- Frontmatter validated: both `name` fields match their directory, both
  descriptions start with "Use when…", both under the 1024-char limit; no
  placeholders/TODOs.
- Manual skill dry-run against a synthetic 4-bug (all easy, enabled) submission
  exercised all four classifications: 1 Found + 1 Partial + 1 False Positive + 2
  Misses → weighted coverage 1.5/4 = 37.5% → ~17/45 → total ~41 → No Hire. The
  procedure is followable and discriminates a weak submission correctly.

## Decisions / notes

- Skills assist, do not replace, reviewer judgment (per PRD).
- Ground truth lives in code/docs; skills point to it, no hardcoded bug/flow lists.
- Automation ground-truth docs depend on PR #1 merging; the skill notes this and
  tells the reviewer to use the PR copy if the local branch lacks it.
- No heavyweight RED-GREEN subagent skill-testing (no real candidate sample
  available); a synthetic dry-run + self-review is the validation.
