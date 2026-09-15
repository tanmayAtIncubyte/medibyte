import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { CtaChip } from "@/components/ui/cta-chip";

// Same sage panel as /closed so the two dead-end pages read as one family,
// but this one has a way out.
export default function NotFound() {
  return (
    <PageContainer>
      <section className="mx-auto mt-4 max-w-3xl rounded-2xl bg-otc p-8 sm:mt-10 sm:p-12">
        <p className="text-sm font-medium text-primary">Error 404</p>
        <h1 className="mt-4 max-w-xl font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-primary sm:text-[3rem]">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/75">
          The page you&apos;re looking for may have moved or never existed. Let&apos;s get you back
          to the pharmacy.
        </p>
        <span className="mt-8 inline-flex items-center gap-1">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
          <CtaChip />
        </span>
      </section>
    </PageContainer>
  );
}
