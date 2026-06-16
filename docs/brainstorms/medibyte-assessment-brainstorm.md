# MediByte Assessment — Brainstorm Summary

## Problem
PLAN.md fully specifies the buggy pharmacy app, but the **assessment loop** (how a candidate hands back what they found) was still marked TBD.

## Options Explored
1. **Excel/Sheet template** — candidate fills Bug | Steps | Expected | Actual | Severity | Test case and returns it; reviewed manually against the answer key. Effort: low. Risk: low.
2. **Markdown in a Git repo** — candidate commits bug-report.md + test cases. Effort: low. Risk: low (dev-leaning, less aligned with the original QA brief).
3. **(Considered & rejected as over-engineering)** Juice-Shop-style auto-detection scoreboard, anti-AI-cheating machinery, hint systems. Effort: high. Risk: high. Out of scope for a manually-reviewed hiring exercise.

## Chosen Direction
**Excel/Sheet template, manually reviewed.** Matches the original assessment docs' Excel deliverable, zero build, and keeps the loop dead simple: send app link → candidate finds bugs + writes test cases → submits one filled file → reviewer skims against the private answer key.

## Key Insights
- Prior art worth borrowing *conceptually* (not building): **OWASP Juice Shop** (difficulty stars per challenge; the idea of a known catalog) and **Qxf2's QA interview tool** (a deliberate "are they actually reading?" tripwire bug; the real signal is *how* candidates communicate their testing, not just bug count).
- The app spec was mature; the high-leverage gap was the mechanics around it, and the right call was to keep those mechanics minimal rather than build a platform.
- The original pain point (generic AI-generated submissions) is addressed by the *variety and subtlety* of the seeded bugs + manual review of reasoning quality — not by anti-cheat tooling.

## Open Questions
- None blocking. Possible future tweak: plant 1–2 Qxf2-style "reading comprehension" tripwire bugs to filter low-effort testers.
- Deployment host still open (Render/Railway vs. build-time-fixed flags on Vercel) — already noted in PLAN.md.
