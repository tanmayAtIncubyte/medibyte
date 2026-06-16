import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <PageContainer>
      <AuthCard
        title="Sign in"
        subtitle="Welcome back to MediByte."
        footerPrompt="New to MediByte?"
        footerLinkLabel="Create an account"
        footerLinkHref="/register"
      >
        <CredentialsForm mode="login" />
      </AuthCard>
    </PageContainer>
  );
}
