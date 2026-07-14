# PRD: MediByte — A Deliberately-Buggy Pharmacy Store for Candidate Assessment

> **Note (historical planning doc).** This PRD captures the original plan. Two
> things evolved since: (1) the runtime admin *toggle* panel was replaced by a
> read-only bug reference — the active flag set is edited in `data/bug-flags.json`
> and redeployed (deploy profile = all 45 ON); (2) runtime state is Redis-backed
> on the deploy (persists), not in-memory-only. See `docs/ADMIN-RUNBOOK.md` and
> `docs/ACCESS-CONTROL.md` for current behavior.

## Overview & Problem

We hire QA and developer candidates and need a reliable way to judge whether they can actually *find* problems in software. Our current take-home assessments (a salary-management build exercise and a "test craftsperson" exercise) no longer give us that signal. Because candidates lean on AI tools, submissions have converged: the test cases all look the same, generic and templated, and we cannot tell who has genuine testing instinct from who pasted a prompt.

MediByte flips the assessment around. Instead of asking candidates to *build* something and grade the output, we build one genuinely good web application ourselves, then deliberately seed it with realistic bugs. The candidate's job becomes: explore the live app, find the bugs, report them clearly, and write test cases that would catch them. This measures real testing and debugging skill — observation, edge-case thinking, and the ability to communicate a defect — rather than the ability to prompt an AI.

We chose an **online pharmacy store** as the domain on purpose. On the surface it is ordinary e-commerce (browse products, add to cart, apply a coupon, check out, view orders), so any candidate understands it instantly with zero industry knowledge. Underneath, prescription products carry sensitive health information, which gives us a believable privacy and data-handling surface — a place where "one customer can see another customer's prescription" is obviously wrong to anyone, and a recognizable serious violation to a senior candidate.

## Goals

- Provide a polished, believable pharmacy web app that feels like a real product, so seeded bugs blend into normal features instead of looking planted.
- Seed approximately 45 bugs spanning six categories and four difficulty tiers, each one independently switchable on or off.
- Give candidates a realistic environment to inspect — including genuine network traffic they can examine in browser developer tools.
- Give the hiring manager a clean "reference" version of the app (the answer key, live) plus a control panel to turn individual bugs on and off.
- Keep the whole thing low-maintenance: no database, no grading platform, deterministic data that behaves the same every time.

## Non-Goals

- We are **not** building a scoring engine, leaderboard, rubric, or any automatic bug-detection. The hiring manager reviews submissions by judgment. This is a deliberate decision, not an omission.
- We are **not** building anti-cheating machinery or hint systems. The variety and subtlety of the bugs, plus manual review of how candidates reason, is what defends against low-effort or AI-pasted submissions.
- We are **not** processing real payments, real patient data, or connecting to any real pharmacy systems. Everything is mock and self-contained.

## Target Users

**The hiring manager (reviewer).** Sends a candidate the app link and a brief, then reviews what comes back. Needs a trustworthy reference version of the app to compare against, a private answer key describing every bug, and the ability to toggle bugs per assessment. Makes the hire/no-hire call by reading the candidate's submission.

**The candidate.** Receives the live app and a short brief. Explores it as a tester or developer would — clicking through flows, trying edge cases, inspecting the network tab — finds as many bugs as they can across categories, and documents each one with reproduction steps and a test case. Needs no special setup beyond a browser.

## Scope: Features & Screens

The app is a complete, working e-commerce pharmacy with the following areas:

- **Accounts & roles** — login and registration. Two kinds of user: an **admin** (who sees the clean, correct app plus the bug-control panel) and **customers** (who experience the seeded bugs).
- **Product catalog** — browse, search, filter, sort, and page through products; product detail pages that distinguish over-the-counter items from prescription items.
- **Cart** — add, remove, and change quantities, with running totals.
- **Discounts** — coupon codes, including valid and expired ones.
- **Checkout** — enter shipping and personal details, supply prescription/health information where required, complete a mock (non-real) payment, and place an order.
- **Orders** — order history and individual order detail, including prescription information.
- **Account** — profile, saved addresses, and insurance details.
- **Admin panel** — a dashboard with an all-orders and all-users view, plus the controls that turn each seeded bug on or off.

The catalog is populated with a realistic mix of roughly a hundred products, dozens of customer accounts, and a few hundred orders — enough to make paging, searching, and loading behave like a real store and feel authentic.

## Bug Taxonomy (Summary)

Every seeded bug is classified on two axes: **what kind of defect it is** (category) and **how hard it is to find** (difficulty). There are about 45 bugs in total. The distribution by category:

| Category | Roughly how many | What it covers |
|---|---|---|
| Functional | ~22 | Incorrect behavior in pricing, cart, coupons, inventory, order flow, and similar |
| Accessibility | ~3 | Barriers for users relying on assistive technology or keyboard navigation |
| Performance / Latency | ~5 | Slow or wasteful loading behavior (simulated, not real load problems) |
| Security / Data handling | ~6 | Exposure of personal or health data, weak access control, client-trusted values |
| UI antipattern | ~4 | Interface choices that mislead or surprise the user |
| User experience (UX) | ~5 | Confusing flows and poor or missing feedback |

The four difficulty tiers describe the *easiest path that surfaces a bug*:

- **Easy** — visible on the normal happy path; you can spot it by looking.
- **Moderate** — needs a deliberate edge-case input or action.
- **Difficult** — needs combining steps, comparing screens, or noticing an inconsistency across the app.
- **Expert** — needs tools (such as the browser network inspector) or a security/edge-case mindset.

A bug is only correctly tiered if it cannot be found by an easier method. This difficulty axis doubles as a seniority signal: the *deepest tier a candidate reaches* tends to be more informative than the raw count of bugs they find.

> Note: this PRD intentionally summarizes the categories and tiers only. The specific bugs, their locations, and how to reproduce them live in a separate private answer key, kept out of any document a candidate could see.

## Constraints & Architecture Decisions

These decisions are settled and shape the build:

- **No database.** Product, user, and order data are fixed, deterministic mock data. This keeps the app maintenance-free and behavior reproducible.
- **Real API, mock data.** Even though there is no database, data is served through genuine web API endpoints, so candidates see real network requests and responses in their browser tools. Several bugs are designed to be discovered there.
- **Role-based bug switching.** The admin always sees correct behavior — the admin build is the live answer key. Customers see a bug only when its switch is turned on. Switches are stored in a simple file and toggled from the admin panel at runtime.
- **One source of truth for bugs.** A single internal registry lists every bug. The correct behavior is always the default; each bug is a gated alternative path. Adding or removing a bug is a small, contained change, so the clean app and the buggy app never drift apart.
- **Cart and order changes are held in memory per session** and reset when the app restarts — acceptable for an assessment.
- **Performance bugs are simulated** via artificial delays and request patterns, not real performance bottlenecks.
- **Realism is a requirement, not polish.** The clean app must look and feel like a believable pharmacy product so that planted bugs hide naturally.

## Assessment Workflow

1. The hiring manager confirms which bugs are switched on for the assessment and sends the candidate a link to the live app plus a short candidate brief.
2. The brief explains the app, the task (find bugs, report them, write test cases), and signals that bugs span functional, accessibility, performance, security, UI, and UX categories — and that the browser network tab is fair game.
3. The candidate explores the app and records findings in a provided spreadsheet template, with columns for: Bug, Steps to Reproduce, Expected, Actual, Severity, and Test Case.
4. The candidate returns the filled-in spreadsheet.
5. The hiring manager reviews it against the private answer key and the live reference (admin) app, and makes the hire decision by judgment — weighing the depth of bugs found and the clarity of reasoning, not just the count.

Two special bugs reinforce the workflow's intent: a "reading tripwire" — a small contradiction planted in product copy that only an attentive tester notices, which filters out skim-testing and AI-paste submissions — and an optional "chained" bug, where finding one issue reveals a second, creating an expert-only discovery path.

## Out of Scope (and Why)

- **Real payments and real patient data** — unnecessary and inappropriate for a hiring exercise; everything stays mock and self-contained.
- **A scoring or grading platform** — explicitly rejected. Manual review by an experienced reviewer is the design, and a rubric engine would add maintenance without improving the hire decision.
- **Anti-cheat tooling and hint systems** — the bug variety and the manual review of reasoning quality address the original problem (generic AI submissions) directly.
- **A persistent multi-user backend** — the assessment does not need durable data; in-memory, per-session state is sufficient.

## Success Criteria

- The clean (admin) app looks and behaves like a genuine, polished pharmacy store, with no accidental defects — confirmed by walking every screen and by automated accessibility checks passing on key pages.
- Around 45 bugs are seeded across the six categories, each one independently switchable, and each correctly tiered so it cannot be found by a method easier than its assigned tier.
- A customer session demonstrably surfaces bugs from every category, including at least one discoverable only via the network tab, one latency bug, one accessibility bug, one UI antipattern, and one UX bug.
- Toggling a bug off in the admin panel makes the corresponding customer behavior correct, and toggling it back on restores the bug — with the change persisting.
- The hiring manager can run a full assessment loop end to end: send the link, receive a filled spreadsheet, and judge it against the private answer key — and the resulting submissions distinguish strong testers from weak ones more clearly than the previous AI-driven take-homes did.
