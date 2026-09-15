import { AccountManager } from "@/components/account/account-manager";
import { PageContainer } from "@/components/layout/page-container";
import { PageRail } from "@/components/layout/page-rail";
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
      <PageRail
        label="On this page"
        items={[
          { label: "Profile", current: true },
          { label: "Saved addresses", href: "#addresses" },
          { label: "Insurance", href: "#insurance" },
        ]}
        footer={[
          { label: "Your orders", href: "/orders" },
          { label: "Your cart", href: "/cart" },
        ]}
      />

      <h1 className="font-heading text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-foreground">
        Your account
      </h1>

      {/* The profile is the customer's identity card, read left to right like a
          membership card: the initials disc, then who it belongs to. */}
      <section className="mt-8 flex items-center gap-5 rounded-2xl bg-secondary p-6 sm:px-7">
        <h2 className="sr-only">Profile</h2>
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-xl font-semibold text-primary-foreground"
        >
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0">
          <p className="font-heading text-[1.75rem] font-semibold leading-tight tracking-tight text-primary">
            {user.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>

      <AccountManager
        initialAddresses={account.addresses}
        initialInsurance={account.insurance}
        defaultFullName={user.name}
      />
    </PageContainer>
  );
}

// The first letters of up to two name words, e.g. "Dana Whitfield" → "DW".
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
