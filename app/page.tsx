import { RefillReminder } from "@/components/home/refill-reminder";
import { PageContainer } from "@/components/layout/page-container";
import { brand } from "@/lib/brand";

const trustHighlights = [
  {
    title: "Licensed pharmacy",
    body: "Every order is reviewed by a registered pharmacist before it ships.",
  },
  {
    title: "Free 2-day delivery",
    body: "Discreet packaging, delivered to your door at no extra cost.",
  },
  {
    title: "Prescription & OTC",
    body: "Manage prescriptions and stock up on everyday essentials in one place.",
  },
];

export default function HomePage() {
  return (
    <PageContainer>
      <section className="rounded-2xl bg-secondary px-6 py-12 sm:px-12 sm:py-16">
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
          {brand.name}
        </p>
        <h1 className="mt-3 max-w-2xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {brand.tagline}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {brand.description}
        </p>
        <div className="mt-8">
          <RefillReminder />
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {trustHighlights.map((highlight) => (
          <article
            key={highlight.title}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-heading text-base font-semibold text-foreground">
              {highlight.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{highlight.body}</p>
          </article>
        ))}
      </section>
    </PageContainer>
  );
}
