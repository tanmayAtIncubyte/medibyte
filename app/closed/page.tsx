import type { Metadata } from "next";

import { Wordmark } from "@/components/brand/logo";
import { PageContainer } from "@/components/layout/page-container";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Assessment closed",
};

// Where the access gate sends anyone without live access: an expired or
// revoked candidate code, or a dead/missing /start link. Deliberately a dead
// end — no navigation actions, because nothing in the app is reachable.
export default function ClosedPage() {
  return (
    <PageContainer>
      <section className="mx-auto mt-4 max-w-3xl rounded-2xl bg-otc p-8 sm:mt-10 sm:p-12">
        <Wordmark tone="light" label={brand.name} className="h-8 w-auto" />
        <h1 className="mt-10 max-w-xl font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-primary sm:text-[3rem]">
          This assessment window has closed.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/75">
          If you believe this is a mistake, contact the person who sent you the
          link.
        </p>
      </section>
    </PageContainer>
  );
}
