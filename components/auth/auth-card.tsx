import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/logo";
import { brand } from "@/lib/brand";

type AuthCardProps = {
  title: string;
  subtitle: string;
  // Footer link is optional — omit all three to render no footer (e.g. login
  // hides the "Create an account" link while keeping the /register route).
  footerPrompt?: string;
  footerLinkLabel?: string;
  footerLinkHref?: string;
  children: ReactNode;
};

/**
 * The sign-in / sign-up frame: a white form card set inside a deep-green panel,
 * with the wordmark and one plain line on the panel's open side. This is the
 * composition incubyte.co uses for its own form section, and it gives the auth
 * pages their one deliberate moment — everything inside the card stays quiet.
 */
export function AuthCard({
  title,
  subtitle,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthCardProps) {
  const showFooter = footerPrompt && footerLinkLabel && footerLinkHref;
  return (
    <div className="mx-auto w-full max-w-4xl pt-4 sm:pt-10">
      <div className="grid overflow-hidden rounded-2xl bg-panel text-panel-foreground lg:grid-cols-[1fr_1.15fr]">
        <aside className="hidden flex-col justify-between p-10 lg:flex">
          <Wordmark tone="dark" label={brand.name} className="h-9 w-auto self-start" />
          <p className="mt-16 max-w-xs font-heading text-[2rem] font-semibold leading-[1.1] tracking-tight">
            Your orders, refills and saved details in one place.
          </p>
        </aside>

        <div className="m-2 rounded-[1.25rem] bg-card p-7 text-foreground sm:m-3 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Wordmark tone="light" label={brand.name} className="h-7 w-auto" />
          </div>
          <h1 className="font-heading text-[2rem] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 mb-7 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
          {children}
          {showFooter && (
            <p className="mt-7 text-sm text-muted-foreground">
              {footerPrompt}{" "}
              <Link
                href={footerLinkHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {footerLinkLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
