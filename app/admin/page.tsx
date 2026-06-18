import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { BugReference } from "@/components/admin/bug-reference";
import { requireAdmin } from "@/lib/auth/guards";
import { listAssessmentBugs } from "@/lib/bug-registry";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  // Only the 45 real assessment bugs — any internal/scaffolding entries are filtered out.
  const bugs = listAssessmentBugs();

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Bug reference
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as {admin.name}. All {bugs.length} seeded defects are active for
          customers; you always see the clean reference app. Use Preview to compare the
          clean and buggy views while grading.
        </p>
      </header>

      <BugReference bugs={bugs} />
    </PageContainer>
  );
}
