# MediByte — Private Answer Key (Phase 4 seeded bugs)

> ⚠️ **PRIVATE — reviewer only.** Never share with candidates. Lists every seeded bug, how to trigger it, and the expected-vs-actual behavior. This is server-side/internal only — it is not part of any candidate-facing build. The canonical source is `lib/bug-registry.ts`; this doc adds repro detail.

All bugs default **OFF** (`data/bug-flags.json`). The reviewer enables a chosen set per assessment from `/admin` (admin login: `admin@medibyte.test` / `admin1234`). **Admin always sees correct behavior**; bugs only manifest for customer logins (`dana@example.test` / `dana1234`, `omar@example.test` / `omar1234`).

Entry format:
```
### <KEY> — <title>
- Category / Difficulty / HIPAA
- Location: <file/route>
- Trigger: <steps to reproduce as a customer>
- Expected (correct / admin): <...>
- Actual (buggy / customer, flag on): <...>
- How to spot it: <eyeball | edge input | cross-screen | DevTools Network/Application | a11y tool>
```

---

_Entries are appended per batch as bugs are built (Batches MED-23 → MED-28)._

<!-- BATCH 1: Functional Easy + Moderate -->
<!-- BATCH 2: Functional Difficult + Expert -->
<!-- BATCH 3: Accessibility -->
<!-- BATCH 4: Performance / Latency -->
<!-- BATCH 5: Security / Transport (HIPAA) -->
<!-- BATCH 6: UI antipattern + UX -->
