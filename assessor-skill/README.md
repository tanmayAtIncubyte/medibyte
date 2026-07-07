# MediByte assessor skill — `assess-submission`

A **portable Claude Skill** that lets any assessor grade a MediByte candidate's
submission in the **Claude apps (desktop/web)** — no repo, no terminal. The
assessor uploads the candidate's document(s) and the skill produces a scorecard:
coverage vs the seeded bugs + craft vs the Incubyte Test Craftsperson framework,
tagged signals (🟢/⚪/🔴/💡/🚩), and an approximate Test Crafter level.

> ⚠️ **Internal to assessors only.** The skill bundles the **answer key** — that's
> intended (assessors need it to grade), but it must **never** reach a candidate.
> Only circulate within the hiring team / org.

## What's in the bundle
```
assess-submission/
  SKILL.md                      the rubric + grading process (what Claude follows)
  answer-key.md                 seeded bugs = ground truth (snapshot of docs/ANSWER-KEY.md)
  test-craftsperson-levels.md   Incubyte craft rubric + L1–L5 (snapshot of docs/QA/…)
  qe-progression-framework.md   craft principles + level definitions (snapshot of docs/QA/…)
  candidate-brief.md            what the candidate was asked to do
```

## Package it (one command)
```bash
cd assessor-skill
zip -r assess-submission.zip assess-submission
```
Share `assess-submission.zip` (or the folder) with your assessors.

## Install in the Claude apps
Exact labels vary a little by plan/version, but the flow is:

**Team / Enterprise (share once with everyone):**
1. A workspace **admin** opens **Settings → Capabilities → Skills** (the org/skills
   management area).
2. **Upload** the `assess-submission` skill (the folder or the zip).
3. Publish/enable it for the workspace → it's now available to **all assessors**
   automatically. No per-person setup.

**Individual (Pro / Max) — each assessor once:**
1. In the Claude app, open **Settings → Capabilities → Skills**.
2. **Add/upload** the `assess-submission` skill (folder or zip).
3. Enable it. Done.

(If your build doesn't expose a Skills uploader, use the **Project** fallback:
create a Project, add the four bundled docs as project knowledge, paste
`SKILL.md`'s rubric into the project instructions, and share the Project with the
team. Assessors then upload the candidate doc into the Project and ask to assess.)

## How an assessor uses it
1. Start a new chat (with the skill enabled).
2. **Upload the candidate's file(s)** — PDF, Word, Excel/CSV, Markdown; one or several.
3. Say e.g. *"Assess this MediByte submission."* (or invoke the skill).
4. Read the scorecard: coverage (found / partial / false-positive / misses),
   craft per dimension with quotes, tagged signals, an approximate Test Crafter
   level, and a strengths/gaps synthesis. **You make the hire call** — the skill
   never does.

## Keeping it current
The four docs are **snapshots**. If the app's seeded bugs, the candidate brief,
or the QA framework change, re-copy them and re-zip:
```bash
cp ../docs/ANSWER-KEY.md            assess-submission/answer-key.md
cp ../docs/CANDIDATE-BRIEF.md       assess-submission/candidate-brief.md
cp "../docs/QA/Test Craftsperson Expertise Levels and Guidelines.md" assess-submission/test-craftsperson-levels.md
cp "../docs/QA/Quality Engineering Progression Framework.md"         assess-submission/qe-progression-framework.md
zip -r assess-submission.zip assess-submission
```
(There's also a Claude-Code-native version of this skill at
`.claude/skills/assess-submission/` for grading locally in the repo — it reads
the live `docs/` files and converts `.docx`/`.xlsx` via the terminal. Same rubric.)
