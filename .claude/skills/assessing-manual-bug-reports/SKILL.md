---
name: assessing-manual-bug-reports
description: Use when grading or reviewing a MediByte manual QA candidate submission, bug reports, test cases, defect writeups, or seeded and non-seeded bug findings against the assessment answer key and the live app.
---

# Assessing Manual Bug Reports

## Overview

Assist reviewer judgment; do not replace it. Ground every match, miss, and score in `lib/bug-registry.ts`, the enabled bug set, and the candidate's submitted evidence.

MediByte is a real, working application, not just a set of planted bugs. Judge a candidate on **all genuine bugs they find — seeded or not.** A genuine defect that simply was not seeded is still valuable QA work and earns credit; finding it must never be penalized. Only true noise costs precision.

Classify every candidate finding into exactly one of three buckets:
- **Genuine defect** — behavior is actually wrong, broken, inconsistent, unsafe, or violates a reasonable spec/user expectation. Includes the seeded registry bugs AND any genuine non-seeded defect. → **Credit** in coverage.
- **Valid observation / missing-feature** — not strictly a defect: a reasonable product/enhancement note or minor UX/a11y nit (e.g. "no forgot-password link", "no order cancellation", "required fields not marked with *"). → **Neutral**: no coverage credit, no penalty.
- **Invalid / misunderstanding / duplicate / noise** — contradicted by the code working correctly, misunderstands intended behavior, duplicates another finding with no new evidence, or is pure vague noise. → **True false positive**: the only bucket penalized.

When unsure whether something is a defect or a non-issue, default to **neutral**, not false positive. Verify disputed claims against the app code before deciding; never invent a defect.

Disabled seeded bugs are `N-A-disabled`, never misses.

## When to use

Use when:
- A reviewer provides a local path to a MediByte manual QA submission.
- The submission contains bug reports, test cases, screenshots, spreadsheets, Markdown, CSV, or a repo.
- The reviewer wants coverage, quality, false-positive, or hiring-band assessment against seeded and non-seeded bugs.

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

To classify a **non-seeded** finding (genuine defect vs. neutral vs. misunderstanding), verify it against the actual app code (`app/`, `components/`, `lib/`) with grep/view before deciding. A claim contradicted by correct code (e.g. "payment accepts any card number" when `lib/payments/payment.ts` validates it) is a true false positive; a plausible, evidenced wrongness with no such contradiction is a genuine defect; an unbuilt feature or preference is neutral.

## Procedure

1. Establish the enabled set.
   - Prefer reviewer-supplied enabled keys when provided.
   - Otherwise read `data/bug-flags.json`; only `true` flags are gradable.
   - Mark all other registry bugs `N-A-disabled`.

2. Parse the candidate submission.
   - Inventory bug reports and test cases from the supplied local path.
   - Preserve citations as `file:line`, `sheet:row`, or `artifact name + row/page`.
   - Capture title, area, steps, expected, actual, evidence, and linked test cases.

3. Match and classify each candidate finding into one of three buckets.
   - **Genuine defect (credited).** Either:
     - `Found`: maps to one enabled registry `key` with correct expected-vs-actual behavior and a reproducible path or decisive evidence; or
     - `Partial`: right symptom/route/area but weak repro, incomplete expected/actual, or materially wrong root cause; or
     - `Non-seeded genuine`: a real defect not in the registry, verified against the code, with plausible wrongness or evidence. Assign it a difficulty weight (easy=1, moderate=2, difficult=3) by severity; +1 if it exposes PHI.
   - **Neutral (no credit, no penalty).** A valid observation or missing-feature: unbuilt functionality, an enhancement request, or a minor preference. Record it but do not score it either way.
   - **True false positive (penalized).** Not a genuine defect: contradicted by correct code, misunderstands intended behavior, duplicates another finding with no new evidence, or is vague noise.
   - `Miss`: an enabled registry bug with no matching finding.
   - Do not double-count one finding against multiple keys/defects unless the evidence independently proves each. When unsure between genuine-defect and neutral, or between neutral and false-positive, default toward the less punitive bucket.

4. Score bug coverage (seeded + non-seeded genuine).
   - Weight by difficulty: easy=1, moderate=2, difficult=3, expert=4. Add +1 weight when `hipaa: true` (or when a non-seeded defect exposes PHI).
   - `earned = seeded Found/Partial weight (full/half) + non-seeded genuine weight`.
   - Coverage% = `earned / total enabled seeded weight`, **capped at 100%**. (The seeded catalog is the yardstick of a thorough pass; genuine non-seeded finds add to the numerator and can lift a candidate who missed some seeded bugs.)

5. Score the other criteria.
   - Report quality: clarity, reproducibility, expected vs actual, evidence.
   - Test-case quality: tests would catch the bugs, include positive and negative paths, and are specific rather than generic or AI-templated.
   - Signal / precision: penalize **only** true false positives (bucket 3), duplicate inflation, and vague noise; reward correct root-cause reasoning. Neutral observations neither help nor hurt.

6. Emit the report.
   - Show the seeded per-bug table, the non-seeded genuine defects, the neutral observations, the category breakdown, score table, band, strengths, gaps, and true false positives.
   - State assumptions, especially if the enabled set was inferred from `data/bug-flags.json`.

## Rubric

| Criterion | Points | How to score |
|---|---:|---|
| Bug coverage | 45 | Difficulty-weighted over genuine defects (seeded + non-seeded). Found = full weight, Partial = half, non-seeded genuine = severity weight, Miss = 0. Coverage% = earned / total enabled seeded weight, capped at 100%. Score = coverage% × 45. |
| Report quality | 30 | Clear numbered repro from a known state, explicit expected vs actual, useful evidence, reproducible without guessing. |
| Test-case quality | 15 | Test cases would catch the bug; include positive and negative cases; specific to MediByte behavior, not generic or templated. |
| Signal / precision | 10 | Penalize only true false positives (misunderstandings, duplicates, vague noise); reward correct root-cause reasoning. Neutral observations do not count against the candidate. |

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
- Enabled seeded bugs: `<count>`
- Non-seeded genuine defects also credited; missing-features neutral; only true noise penalized.

## Seeded bug results
| key | category | difficulty | HIPAA | status | evidence cite |
|---|---|---|---|---|---|
| FN_EXAMPLE | functional | moderate | no | Found | bugs.xlsx:row 12 |
| SEC_EXAMPLE | security | difficult | yes | Miss | — |
| UX_EXAMPLE | ux | easy | no | N-A-disabled | — |

## Non-seeded genuine defects credited
| finding | category | est. weight | evidence cite |
|---|---|---:|---|
| ... | security | 2 | report.pdf:p4 |

## Neutral observations (no credit, no penalty)
- ... (missing feature / preference / minor nit)

## Coverage
- Seeded bugs found: X/Y enabled seeded bugs
- Earned weight: seeded S + non-seeded N = T / <total seeded weight> = Z% (capped at 100%)

## Category breakdown (seeded)
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

## True false positives
| candidate finding | reason | cite |
|---|---|---|
| ... | Contradicted by correct code / misunderstanding / duplicate / vague noise | ... |
```

## Common mistakes

- **Penalizing a genuine non-seeded defect as a false positive.** MediByte is a real app; a verified real bug that was not seeded still earns credit.
- **Crediting a missing feature or preference as a defect.** Unbuilt functionality and enhancement requests are neutral, not coverage.
- **Calling something a false positive without checking the code.** Verify disputed non-seeded claims against `app/`, `components/`, `lib/` first; default to neutral when unsure.
- Counting disabled seeded bugs as misses. Disabled bugs are `N-A-disabled`.
- Rewarding raw defect count over depth, reproducibility, and evidence.
- Marking symptom-only reports as `Found` when expected-vs-actual or repro is missing.
- Accepting a vague area match as a bug match without checking the registry key's actual effect.
- Letting duplicate reports inflate coverage.
- Penalizing a candidate for not finding a seeded bug that was not enabled.
- Treating generic or AI-templated test cases as strong coverage when they would not catch the specific behavior.
- Sharing `docs/ANSWER-KEY.md`, `docs/ADMIN-RUNBOOK.md`, or `private/` content with candidates.
