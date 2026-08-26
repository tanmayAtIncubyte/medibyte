---
name: assessing-automation-repo
description: Use when reviewing or grading a MediByte automation candidate repository, including Playwright, Cypress, Selenium, Cucumber, SpecFlow, Behave, BDD submissions, or assigned automation flow/tier evidence.
---

# Assessing MediByte Automation Repos

## Overview

Use this skill to assist reviewer judgment when grading a QA candidate's automation submission for the MediByte assessment app. Grade against the assigned clean automation flow and tier; this is not a bug hunt.

## When to use

Use when a reviewer provides:
- A local path to an already-cloned candidate automation repo.
- The assigned flow/tier, or enough README/scenario evidence to infer it.
- A Playwright, Cypress, Selenium, Cucumber, SpecFlow, Behave, or similar BDD automation submission.

Do not use for:
- MediByte manual bug-hunt submissions.
- Grading bug reports against `docs/ANSWER-KEY.md`.
- Running arbitrary candidate code without explicit reviewer consent.

## Inputs

Required:
- Candidate repo local path.
- Assigned flow/tier, if known:
  - Tier 1 / Flow 1: Discovery & Purchase, 1-3 years.
  - Tier 2 / Flow 2: Cart & Coupon Management, 4-6 years.
  - Tier 3 / Flow 3: Account & Order-History Verification, 6+ years.

Optional:
- Reviewer-supervised run result and report artifact path.
- Notes from the candidate about assumptions or known issues.

If the tier is not provided, infer it from README, feature files, scenario names, tested pages, and TC coverage. State the inference and confidence.

## Ground truth

Use `docs/automation-qa/flows-and-test-cases.md` as the canonical source for flows, TC IDs, and tier difficulty. That document lands via PR #1 (`feat/automation-qa-track`); if the local branch does not contain it yet, ask the reviewer for the PR copy or switch to that branch.

Steve is the automation account: `steve@example.test` / `steve1234`. Steve sees the storefront clean and bug-free, with no admin access. Candidates automate one assigned clean flow; do not reward unrelated bug discovery.

Locator ground truth:
- The app intentionally has no `id`, no `data-testid`, and no guessable hooks for these flows.
- Elements remain reachable by accessible name and role.
- Tier 1 expects unique accessible names.
- Tier 2 expects correct per-line scoping for duplicate-named cart controls and waits for async cart/coupon recalculation.
- Tier 3 expects cross-page state comparison plus positional, section, or nested disambiguation.

## Security: candidate code is untrusted

Candidate code is UNTRUSTED.

Do not auto-run `npm install`, `pip install`, package-manager scripts, browser tests, shell scripts, or the submitted test suite without explicit reviewer consent. Prefer static review first. If execution is needed, recommend a sandbox/container or other isolated environment, and have the reviewer supervise dependency install and test execution.

Grade "runs green" from one of these only:
- The reviewer's supervised run.
- A provided report artifact plus static evidence that the suite is runnable.
- Clear README/config evidence when execution is intentionally deferred.

Never blindly execute candidate code to prove the score.

## Procedure

1. Identify the assigned flow/tier.
   - Prefer reviewer input.
   - Otherwise infer from feature files, scenario names, tested pages, TC IDs, README, and report names.
   - Record whether the repo appears to target Flow 1, Flow 2, Flow 3, or the wrong scope.
2. Inventory BDD scenarios and map them to TC IDs.
   - Use `docs/automation-qa/flows-and-test-cases.md`.
   - Build a per-test-case coverage table: yes, partial, or no.
   - Cite evidence as `file:line`.
3. Assess locator strategy against tier.
   - Look for role/name/label/text locators in the tool's idiom.
   - Penalize `id`, `data-testid`, CSS/XPath tied to layout, indexes used as the primary strategy, or hooks that do not exist in MediByte.
   - Tier 2: verify duplicate cart controls are scoped to the intended line/product and totals/coupon state are awaited.
   - Tier 3: verify account, checkout, order list, and order detail data are carried and compared across pages; check section/position/nested disambiguation.
4. Assess assertions.
   - Reward assertions on visible state, calculated totals, errors, order identity, and cross-page equality.
   - Penalize console logs, screenshots-only checks, sleeps followed by no assertion, or scenarios that only prove navigation.
   - Negative case expected especially for checkout required-field validation.
5. Assess runs-anywhere and reporting.
   - README explains clone/install/run.
   - Base URL and Steve credentials come from env/config/CLI, not one machine's local path or hardcoded URL.
   - Report artifact is generated or committed as requested and openable by a reviewer.
6. Assess async/wait handling.
   - Reward waits on user-visible recalculated state, network completion only when tied to state, and framework auto-waits.
   - Penalize hardcoded sleeps as the main synchronization strategy.
7. Score with the rubric and produce the report.
   - Be evidence-based and concise.
   - The rubric assists judgment; reviewer override is allowed when justified.

## Rubric

| Criterion | Points | Check |
| --- | ---: | --- |
| Flow coverage & correctness | 25 | Automates the assigned journey and maps to the relevant TC IDs in `docs/automation-qa/flows-and-test-cases.md`; expected results are correct. |
| Locator strategy vs tier | 20 | Uses accessible-name/role locators, not brittle or absent `id`/`data-testid`; Tier 2 scopes duplicate-named controls to the correct cart line; Tier 3 handles cross-page, positional, and nested disambiguation. |
| Assertion quality | 15 | Assertions verify behavior and calculated state, not logs or vanity checks; includes negative cases such as blank required checkout field showing an error. |
| Runs-anywhere + reporting | 15 | README covers clone/install/run; base URL and credentials supplied via config/env/CLI; no one-machine hardcoding; produces an openable HTML/Allure/similar report. |
| Async/wait handling | 10 | Waits for recalculated totals, applied/removed coupon state, pending submit state, or navigation based on state; avoids hardcoded sleeps. |
| BDD structure | 10 | Given/When/Then scenarios are present, readable, and mapped to the assigned journey. |
| Code quality & git hygiene | 5 | Clear page-object or equivalent structure, DRY steps/helpers, no committed secrets, multiple incremental commits where history is available. |
| **Total** | **100** |  |

Bands:
- Strong Hire: 80-100.
- Hire: 65-79.
- Borderline: 50-64.
- No Hire: below 50.

## Output report template

```markdown
# MediByte Automation Assessment Report

Candidate repo: <path>
Assigned flow/tier: <Flow N / Tier N, source or inference>
Reviewer run evidence: <supervised run/report/static only>
Security note: Candidate code was treated as untrusted; no unsupervised install/run was performed.

## Per-test-case coverage

| TC id | Covered? | Assertion quality | Evidence |
| --- | --- | --- | --- |
| TCx.x | yes/partial/no | strong/adequate/weak/missing | `file:line` |

## Assigned flow/tier fit

<Did the submission target the correct flow? Did it handle the tier's locator difficulty?>

## Scores

| Criterion | Score | Max | Evidence |
| --- | ---: | ---: | --- |
| Flow coverage & correctness |  | 25 |  |
| Locator strategy vs tier |  | 20 |  |
| Assertion quality |  | 15 |  |
| Runs-anywhere + reporting |  | 15 |  |
| Async/wait handling |  | 10 |  |
| BDD structure |  | 10 |  |
| Code quality & git hygiene |  | 5 |  |
| **Total** |  | **100** |  |

Band: Strong Hire / Hire / Borderline / No Hire
Reviewer override: <optional, with reason>

## Top strengths

- ...

## Top gaps

- ...
```

## Common mistakes

- Auto-running untrusted candidate code or installing dependencies without explicit reviewer consent.
- Rewarding a suite that only runs on the candidate's machine.
- Accepting log statements, screenshots, or report rows as substitutes for assertions.
- Giving credit for `id` or `data-testid` locators even though those hooks do not exist in the MediByte automation flows.
- Ignoring the assigned tier's structural difficulty.
- Treating Flow 2 generic "Remove" or "Increase" selectors as sufficient without cart-line scoping.
- Treating Flow 3 order-history checks as sufficient when they only click the first row and never compare order ID, total, status, items, or shipping data across pages.
- Counting hardcoded sleeps as reliable async handling.
- Penalizing candidates for not finding seeded bugs; Steve's flow is intentionally clean.
