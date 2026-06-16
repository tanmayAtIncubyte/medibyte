import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBugActive } from "@/lib/bugs";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  // Resolve the transport/storage seeded-bug flags at the page boundary and pass
  // plain booleans into the (client) form. A logged-out visitor is treated as a
  // non-admin, so an admin signing in fresh from a logged-out state would still
  // get the clean flow only if they were already an admin — which is the point:
  // these are pre-auth transport bugs, observable for the customer flow.
  const user = await getCurrentUser();
  const credsInUrl = isBugActive("SEC_CREDS_IN_URL", user);
  const tokenInLocalStorage = isBugActive("SEC_TOKEN_LOCALSTORAGE", user);

  return (
    <PageContainer>
      <AuthCard
        title="Sign in"
        subtitle="Welcome back to MediByte."
        footerPrompt="New to MediByte?"
        footerLinkLabel="Create an account"
        footerLinkHref="/register"
      >
        <CredentialsForm
          mode="login"
          credentialsInUrl={credsInUrl}
          persistIdentityToLocalStorage={tokenInLocalStorage}
        />
      </AuthCard>
    </PageContainer>
  );
}
