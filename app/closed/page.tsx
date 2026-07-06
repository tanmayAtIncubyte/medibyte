import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Assessment closed",
};

// Where the access gate sends anyone without live access: an expired or
// revoked candidate code, or a dead/missing /start link. Deliberately a dead
// end — no navigation actions, because nothing in the app is reachable.
export default function ClosedPage() {
  return (
    <PageContainer className="flex flex-col items-center justify-center text-center">
      <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
        MediByte
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        This assessment window has closed.
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        If you believe this is a mistake, contact the person who sent you the
        link.
      </p>
    </PageContainer>
  );
}
