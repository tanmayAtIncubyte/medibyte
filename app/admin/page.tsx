import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Admin
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as {admin.name}. The bug-flag control panel arrives in the next slice.
        </p>
      </header>
    </PageContainer>
  );
}
