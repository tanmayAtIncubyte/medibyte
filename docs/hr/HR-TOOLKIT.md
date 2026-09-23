# MediByte — HR Toolkit

Sep 23, 2026 · Tanmay

## What this is

Every QA candidate gets two things from HR: a **personal access link** and the **right brief**. This toolkit shows how to create the link, which brief to send, and what to write.

MediByte is our practice online pharmacy. Candidates test it like a real store; the brief tells them what to do.

## Which link and brief to send

Pick the row that matches the candidate. The **Track** is what you choose when creating the link; the **Brief** is the PDF you attach to the email.

| Candidate | Track to choose | Brief to attach |
| --- | --- | --- |
| Manual QA (any experience) | Manual (bug hunting — dana/omar) | `CANDIDATE-BRIEF.pdf` |
| Automation QA, 1–3 years | Automation (clean app — Steve) | `assignment-easy.pdf` |
| Automation QA, 4–6 years | Automation (clean app — Steve) | `assignment-medium.pdf` |
| Automation QA, 6+ years | Automation (clean app — Steve) | `assignment-hard.pdf` |

The track and the brief must match. A manual link will not let an automation candidate sign in, and the other way round.

Where the PDFs live: `docs/CANDIDATE-BRIEF.pdf` and `docs/automation-qa/assignment-easy.pdf`, `-medium.pdf`, `-hard.pdf` in the MediByte repo.

## Create the link

It takes about a minute per candidate.

1. Go to [medibyte-git-dev-medibyte.vercel.app/login](https://medibyte-git-dev-medibyte.vercel.app/login) and sign in with the admin account (Tanmay shares the credentials separately; never send them to a candidate).
2. Click **Candidates** in the top menu.
3. Fill in the form at the top:
   - **Candidate name** and **Email** (required). One email can have only one link at a time.
   - **Role / position** (optional), e.g. Senior QA.
   - **Track**: Manual or Automation, from the table above.
   - **Window (days)**: how long the link works. Default is 10.
   - **Internal notes** (optional). Only reviewers see these, e.g. the tier you're sending: "Automation — medium".
4. Click **Create access link**. The candidate appears in the list below with status **Not started yet**.
5. Click **Copy link** on their row. That link is what you send.

The 10-day clock starts when you create the link, not when the candidate first opens it.

## Send it to the candidate

One email: the copied link in the body, the matching brief attached. Don't include the admin login or anything from the Admin page.

```markdown
Subject: Your Incubyte QA assessment

Hi <name>,

Thanks for your interest in the QA role at Incubyte. The next step is a
hands-on assessment on MediByte, a practice online pharmacy.

1. Open your personal link first, before signing in:
   <paste the copied link>
2. Read the attached brief. It has everything you need, including the
   account to sign in with.

Your link is valid for <10> days, until <date>. Please use the same
browser throughout, and send your submission before the link expires.

If anything doesn't work, reply to this email.

Best,
<your name>
```

For automation candidates you can add one line: "Open the link in the browser your tests run in."

## After you send it

The Candidates list shows each person's status and when their access ends.

| You see | It means |
| --- | --- |
| Active, Not started yet | Link created, candidate hasn't opened it |
| Active, Started \<date> | Candidate has opened the link and is working |
| Expired | The window ran out |
| Revoked | You cut access off early |

What you can do on a row:

| Action | When to use it | Where |
| --- | --- | --- |
| **Extend** | Candidate needs more time. Type the extra days (default 5), click Extend | Active rows |
| **Revoke** | Stop access now, e.g. the candidate withdrew. Asks you to confirm; can be undone with Re-grant | Active rows |
| **Copy link** | Resend the same link | Active rows |
| **Re-grant** | Give an expired or revoked candidate a fresh window. They reuse the same link | Expired / Revoked rows |
| **Remove** | Delete the candidate for good, so the email can be used again. Asks you to confirm | Expired / Revoked rows |

Each re-grant adds an attempt; the clock icon on the row shows the full history.

## When a candidate is stuck

| Candidate says | What to do |
| --- | --- |
| "The site says the assessment window has closed" | They opened the site without the link, or in a different browser. Ask them to open the link from your email first. If the row shows Expired or Revoked, Re-grant. |
| "I can't sign in" | Check the track matches the brief you sent. A manual link only works with the accounts in the Candidate Brief; an automation link only with the account in the assignment. Wrong track: Remove them and create a new link. |
| "I need more time" | Extend on their row. |
| "I lost the link" | Copy link on their row and resend. |
| "Can I create my own account?" | No. They must use the account in their brief. |
| You typed the wrong email | Remove (on an expired/revoked row) or Revoke then Remove, and create a new link. |

Anything else: ask Tanmay. The reviewer handbook is `docs/ADMIN-RUNBOOK.md`; it holds the answer key, so it stays inside the team.
