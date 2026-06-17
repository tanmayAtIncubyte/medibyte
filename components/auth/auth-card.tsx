import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
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
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{subtitle}</p>
      {children}
      <p className="mt-6 text-sm text-muted-foreground">
        {footerPrompt}{" "}
        <Link href={footerLinkHref} className="font-medium text-primary hover:underline">
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
