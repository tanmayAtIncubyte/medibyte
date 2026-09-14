import Link from "next/link";
import type { ReactNode } from "react";

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
    <div className="mx-auto w-full max-w-[26rem] pt-8 sm:pt-16">
      <div className="rounded-[1.75rem] border border-border bg-card p-8 shadow-[0_10px_40px_rgba(1,77,67,0.07)] sm:p-10">
        <h1 className="font-heading text-[2rem] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 mb-7 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        {children}
      </div>
      {showFooter && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
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
  );
}
