# MediByte — Difficulty Calibration Brainstorm

## Problem
The bug tiers (easy → expert) were labels with no objective basis, and it was unclear how a candidate's findings should inform a hiring decision.

## Options Explored
1. **Tier by easiest discovery path** — classify each bug by the simplest method that surfaces it (eyeball → edge input → cross-screen reasoning → tools/security mindset). Effort: low. Risk: low.
2. **Tier by time-to-find** — calibrate by how long a competent tester takes. Effort: low. Risk: medium (hard to verify objectively).
3. **Tier by business impact / severity** — measures consequence, not find-difficulty. Effort: low. Risk: low (but answers a different question).
4. **Blend impact + find-difficulty** — two scores per bug. Effort: medium. Risk: low.
5. **(Rejected) A hire/no-hire scoring rubric** — depth/breadth/quality lenses, expectation-by-level table. The user explicitly does not want a grading mechanism.

## Chosen Direction
**Tier by the easiest path that surfaces the bug** (option 1). A bug is only correctly tiered if it cannot be found by an easier method. **No scoring mechanism** — the reviewer makes the hire call by judgment from the submitted Excel template.

The deeper requirement that emerged: the user just wants the **website live with bugs that hide naturally** — no assessment tooling around it.

## Key Insights
- The same find-difficulty axis doubles as a **seniority detector**: the *deepest tier a candidate reaches* is more informative than raw bug count.
- **Natural hiding is a real build requirement:** the clean app must feel like a polished, believable pharmacy product so seeded bugs blend into normal features rather than looking planted. Realism ≠ vanity polish here.
- Calibration consequence: an "expert" bug must not also be detectable by an easy method (e.g. a Network-tab PHI leak must not throw a visible UI error).

## Prior-art integrations (zero/low build)
Reviewed OWASP Juice Shop and Qxf2's QA interview tool for steals. Adopted, within the existing 45 bugs (not extra):
- **Reading tripwire (Qxf2):** 1 content/copy contradiction that only attentive testers catch — filters skim/AI-paste submissions.
- **Chained bug (Juice Shop):** 1 expert path where finding bug A reveals bug B (IDOR → reused order id → PHI over-fetch). Marked optional.

Considered but NOT adopted (would add mechanism the user rejected): scoreboard/auto-detection, OWASP Top 10 answer-key labels, formal tool-discoverability verification step.

## Open Questions
- None. All principles + the two special bugs are recorded in PLAN.md under "Difficulty calibration & natural hiding" → "Two special bugs."
