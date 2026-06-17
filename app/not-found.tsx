import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer className="flex flex-col items-center justify-center text-center">
      <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
        Error 404
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for may have moved or never existed. Let&apos;s get you back
        to the pharmacy.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </PageContainer>
  );
}
