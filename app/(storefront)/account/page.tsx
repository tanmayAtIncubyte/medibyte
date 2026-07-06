import { UserRound } from "lucide-react";

import { AccountManager } from "@/components/account/account-manager";
import { PageContainer } from "@/components/layout/page-container";
import { requireUser } from "@/lib/auth/guards";
import { readAccount } from "@/lib/account/account-service";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  // Own-account only: the page reads the signed-in user's id from the session
  // and only ever loads that user's account state. There is no way to request
  // another user's account here.
  const user = await requireUser();
  const account = await readAccount(user.id);

  return (
    <PageContainer>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Your account
      </h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <UserRound className="size-5" aria-hidden />
          <h2 className="font-heading text-lg font-semibold text-foreground">Profile</h2>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
            <dd className="text-foreground">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="text-foreground">{user.email}</dd>
          </div>
        </dl>
      </section>

      <AccountManager
        initialAddresses={account.addresses}
        initialInsurance={account.insurance}
        defaultFullName={user.name}
      />
    </PageContainer>
  );
}
