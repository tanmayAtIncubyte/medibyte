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
      <h1 className="font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-foreground">
        Your account
      </h1>

      {/* The profile is the customer's identity card: the name carries it, set
          in the display face on the mint ground; the email sits beneath. */}
      <section className="mt-8 rounded-2xl bg-secondary p-6 sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <UserRound className="size-5" aria-hidden />
          <h2 className="font-heading text-xl font-semibold text-foreground">Profile</h2>
        </div>
        <p className="mt-6 font-heading text-[2rem] font-semibold leading-tight tracking-tight text-primary sm:text-[2.5rem]">
          {user.name}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      </section>

      <AccountManager
        initialAddresses={account.addresses}
        initialInsurance={account.insurance}
        defaultFullName={user.name}
      />
    </PageContainer>
  );
}
