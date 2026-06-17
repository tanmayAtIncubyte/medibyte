import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { BugFlagPanel } from "@/components/admin/bug-flag-panel";
import { requireAdmin } from "@/lib/auth/guards";
import { listAssessmentBugs } from "@/lib/bug-registry";
import { loadBugFlags } from "@/lib/bug-flags";

export const metadata: Metadata = {
  title: "Admin",
};

// Always read the flag file fresh so a toggle is reflected on reload.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  // Only the 45 real assessment bugs — any internal/scaffolding entries are filtered out.
  const bugs = listAssessmentBugs();
  const flags = loadBugFlags();

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Bug control panel
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as {admin.name}. Toggle which seeded defects customers see in
          an assessment. Admins always see the clean reference app.
        </p>
      </header>

      <BugFlagPanel bugs={bugs} initialFlags={flags} />
    </PageContainer>
  );
}
