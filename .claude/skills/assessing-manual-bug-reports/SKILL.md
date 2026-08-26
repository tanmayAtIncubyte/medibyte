---
name: assessing-manual-bug-reports
description: Use when grading or reviewing a MediByte manual QA candidate submission, bug reports, test cases, defect writeups, or seeded-bug findings against the assessment answer key.
---

# Assessing Manual Bug Reports

## Overview

Assist reviewer judgment; do not replace it. Ground every match, miss, and score in `lib/bug-registry.ts`, the enabled bug set, and the candidate's submitted evidence.

Grade only seeded MediByte assessment bugs that were enabled for that candidate. Disabled bugs are `N-A-disabled`, never misses.

## When to use

Use when:
- A reviewer provides a local path to a MediByte manual QA submission.
- The submission contains bug reports, test cases, screenshots, spreadsheets, Markdown, CSV, or a repo.
- The reviewer wants coverage, quality, false-positive, or hiring-band assessment against seeded bugs.

Do not use when:
- Reviewing automated Playwright/Cypress implementation quality only.
- Grading a non-MediByte product.
- Sharing answer-key details with a candidate.

## Inputs

Required:
- Local path to the already-cloned candidate submission.

Optional:
- Enabled bug keys for this assessment. If omitted, read `data/bug-flags.json` and grade keys with `true` flags.
- Reviewer notes about intentionally disabled bugs, environment issues, or accepted equivalent evidence.

Context:
- Bugs manifest for customer logins only: `dana@example.test` / `dana1234`, `omar@example.test` / `omar1234`.
- Admin sees the clean app and should not be used as candidate repro evidence for buggy behavior.

## Ground truth

Use these sources before scoring:
- `lib/bug-registry.ts` — canonical bug list and metadata: `key`, `title`, `category`, `difficulty`, `hipaa`, `location`, `effect`, `where`, `howToSpot`.
- `docs/ANSWER-KEY.md` — reviewer-only repro detail: Trigger, Expected, Actual, How to spot.
- `docs/CANDIDATE-BRIEF.md` — candidate-facing instructions and required report fields.
- `data/bug-flags.json` — default enabled set when reviewer does not supply one.

The registry is canonical so the skill stays correct as bugs change. Do not hardcode the full bug list into the skill.

## Procedure

1. Establish the enabled set.
   - Prefer reviewer-supplied enabled keys when provided.
   - Otherwise read `data/bug-flags.json`; only `true` flags are gradable.
   - Mark all other registry bugs `N-A-disabled`.

2. Parse the candidate submission.
   - Inventory bug reports and test cases from the supplied local path.
   - Preserve citations as `file:line`, `sheet:row`, or `artifact name + row/page`.
   - Capture title, area, steps, expected, actual, evidence, and linked test cases.

3. Match and classify each candidate report.
   - `Found`: maps to one enabled registry `key` and has the correct expected-vs-actual behavior with a reproducible path or decisive evidence.
   - `Partial`: right symptom, route, or area, but repro is weak, expected/actual is incomplete, or root cause is materially wrong.
   - `False Positive`: not a seeded enabled bug, duplicates another report without new evidence, or misunderstands correct product behavior.
   - `Miss`: an enabled registry bug with no matching candidate report.
   - Do not double-count one report against multiple keys unless the evidence independently proves each bug.

4. Score bug coverage.
   - Weight by difficulty: easy=1, moderate=2, difficult=3, expert=4.
   - Add +1 weight when `hipaa: true`.
   - Found earns full weight; Partial earns half weight; Miss earns zero.
   - Coverage% = earned enabled weight / total enabled weight.

5. Score the other criteria.
   - Report quality: clarity, reproducibility, expected vs actual, evidence.
   - Test-case quality: tests would catch the bugs, include positive and negative paths, and are specific rather than generic or AI-templated.
   - Signal / precision: false positives, vague noise, duplicate inflation, and reasoning quality.

6. Emit the report.
   - Show the evidence-backed per-bug table, category breakdown, score table, band, strengths, gaps, and false positives.
   - State assumptions, especially if the enabled set was inferred from `data/bug-flags.json`.

## Rubric

| Criterion | Points | How to score |
|---|---:|---|
| Bug coverage | 45 | Difficulty-weighted over enabled bugs only. Found = full weight, Partial = half, Miss = 0. Score = coverage% × 45. |
| Report quality | 30 | Clear numbered repro from a known state, explicit expected vs actual, useful evidence, reproducible without guessing. |
| Test-case quality | 15 | Test cases would catch the bug; include positive and negative cases; specific to MediByte behavior, not generic or templated. |
| Signal / precision | 10 | Penalize false positives, duplicates, and vague noise; reward correct root-cause reasoning over symptom-only notes. |

Hiring bands:
- Strong Hire: ≥80
- Hire: 65-79
- Borderline: 50-64
- No Hire: <50

The band assists judgment. The reviewer may override it with written rationale.

## Output report template

```markdown
# MediByte Manual QA Assessment — <candidate>

## Assumptions
- Submission path: `<local path>`
- Enabled set source: `<reviewer supplied | data/bug-flags.json>`
- Enabled bugs: `<count>`

## Per-bug results
| key | category | difficulty | HIPAA | status | evidence cite |
|---|---|---|---|---|---|
| FN_EXAMPLE | functional | moderate | no | Found | bugs.xlsx:row 12 |
| SEC_EXAMPLE | security | difficult | yes | Miss | — |
| UX_EXAMPLE | ux | easy | no | N-A-disabled | — |

## Enabled-set coverage
- Bugs found: X/Y enabled bugs
- Weighted coverage: X/Y = Z%

## Category breakdown
| category | found | partial | missed | total enabled |
|---|---:|---:|---:|---:|
| functional | 0 | 0 | 0 | 0 |
| a11y | 0 | 0 | 0 | 0 |
| perf | 0 | 0 | 0 | 0 |
| security | 0 | 0 | 0 | 0 |
| ui | 0 | 0 | 0 | 0 |
| ux | 0 | 0 | 0 | 0 |

## Scores
| criterion | score | notes |
|---|---:|---|
| Bug coverage | 0/45 |  |
| Report quality | 0/30 |  |
| Test-case quality | 0/15 |  |
| Signal / precision | 0/10 |  |
| Total | 0/100 |  |

## Band
<Strong Hire | Hire | Borderline | No Hire>

## Top strengths
- ...

## Top gaps
- ...

## False positives
| candidate finding | reason | cite |
|---|---|---|
| ... | Not a seeded/enabled bug | ... |
```

## Common mistakes

- Counting disabled bugs as misses. Disabled bugs are `N-A-disabled`.
- Rewarding raw defect count over depth, reproducibility, and evidence.
- Marking symptom-only reports as `Found` when expected-vs-actual or repro is missing.
- Accepting a vague area match as a bug match without checking the registry key's actual effect.
- Letting duplicate reports inflate coverage.
- Penalizing a candidate for not finding a bug that was not enabled.
- Treating generic or AI-templated test cases as strong coverage when they would not catch the specific seeded behavior.
- Sharing `docs/ANSWER-KEY.md`, `docs/ADMIN-RUNBOOK.md`, or `private/` content with candidates.
