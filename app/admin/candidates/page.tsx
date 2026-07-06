import type { Metadata } from "next";
import Link from "next/link";

import { CandidateManager } from "@/components/admin/candidate-manager";
import { PageContainer } from "@/components/layout/page-container";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Candidate access",
};

export default async function AdminCandidatesPage() {
  await requireAdmin();

  return (
    <PageContainer>
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Candidate access
            </h1>
            <p className="mt-2 text-muted-foreground">
              Mint time-boxed access links for candidates. A code expires on its
              own when its window lapses; revoking locks the candidate out
              immediately.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            ← Bug reference
          </Link>
        </div>
      </header>

      <CandidateManager />
    </PageContainer>
  );
}
