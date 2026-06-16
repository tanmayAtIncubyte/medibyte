import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { PageContainer } from "@/components/layout/page-container";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <PageContainer>
      <AuthCard
        title="Create your account"
        subtitle="Sign up to order from MediByte."
        footerPrompt="Already have an account?"
        footerLinkLabel="Sign in"
        footerLinkHref="/login"
      >
        <CredentialsForm mode="register" />
      </AuthCard>
    </PageContainer>
  );
}
