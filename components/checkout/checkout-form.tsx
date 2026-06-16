"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FileText, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RxItem = { productId: string; productName: string };

type FieldErrors = Record<string, string>;

/**
 * Checkout form. Collects shipping (PII), the prescription/health details (PHI)
 * for any Rx items, and a clearly-mock payment step. Submits to the inspectable
 * /api/checkout endpoint; on success navigates to the order confirmation. PHI is
 * sent in the request BODY only (never the URL) and is not stored client-side
 * beyond the live form state.
 */
export function CheckoutForm({
  rxItems,
  defaultFullName,
}: {
  rxItems: RxItem[];
  defaultFullName: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const form = new FormData(event.currentTarget);

    const shipping = {
      fullName: str(form, "shipping.fullName"),
      street: str(form, "shipping.street"),
      city: str(form, "shipping.city"),
      region: str(form, "shipping.region"),
      postalCode: str(form, "shipping.postalCode"),
      country: str(form, "shipping.country"),
    };

    const prescriptions: Record<string, Record<string, string>> = {};
    for (const item of rxItems) {
      prescriptions[item.productId] = {
        patientName: str(form, `prescription.${item.productId}.patientName`),
        dateOfBirth: str(form, `prescription.${item.productId}.dateOfBirth`),
        prescribingDoctor: str(form, `prescription.${item.productId}.prescribingDoctor`),
        prescriptionNumber: str(form, `prescription.${item.productId}.prescriptionNumber`),
        notes: str(form, `prescription.${item.productId}.notes`),
      };
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shipping, prescriptions }),
      });

      if (res.status === 201) {
        const { orderId } = (await res.json()) as { orderId: string };
        router.push(`/orders/${encodeURIComponent(orderId)}?placed=1`);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: FieldErrors;
      };
      setErrors(data.errors ?? {});
      setFormError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    } catch {
      setFormError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <Section icon={<Truck aria-hidden className="size-5" />} title="Shipping address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="shipping.fullName"
            label="Full name"
            defaultValue={defaultFullName}
            errors={errors}
            autoComplete="name"
            className="sm:col-span-2"
          />
          <Field
            name="shipping.street"
            label="Street address"
            errors={errors}
            autoComplete="street-address"
            className="sm:col-span-2"
          />
          <Field name="shipping.city" label="City" errors={errors} autoComplete="address-level2" />
          <Field
            name="shipping.region"
            label="State / region"
            errors={errors}
            autoComplete="address-level1"
          />
          <Field
            name="shipping.postalCode"
            label="Postal code"
            errors={errors}
            autoComplete="postal-code"
          />
          <Field
            name="shipping.country"
            label="Country"
            defaultValue="USA"
            errors={errors}
            autoComplete="country-name"
          />
        </div>
      </Section>

      {rxItems.length > 0 && (
        <Section
          icon={<FileText aria-hidden className="size-5" />}
          title="Prescription information"
          description="Required for the prescription items in your order. Kept private and used only to fill your prescription."
        >
          <div className="space-y-6">
            {rxItems.map((item) => (
              <fieldset
                key={item.productId}
                className="rounded-lg border border-border p-4"
              >
                <legend className="px-1 text-sm font-semibold text-foreground">
                  {item.productName}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name={`prescription.${item.productId}.patientName`}
                    label="Patient name"
                    errors={errors}
                  />
                  <Field
                    name={`prescription.${item.productId}.dateOfBirth`}
                    label="Date of birth"
                    type="date"
                    errors={errors}
                  />
                  <Field
                    name={`prescription.${item.productId}.prescribingDoctor`}
                    label="Prescribing doctor"
                    errors={errors}
                  />
                  <Field
                    name={`prescription.${item.productId}.prescriptionNumber`}
                    label="Prescription number"
                    errors={errors}
                  />
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`prescription.${item.productId}.notes`}
                      className="block text-sm font-medium text-foreground"
                    >
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      id={`prescription.${item.productId}.notes`}
                      name={`prescription.${item.productId}.notes`}
                      rows={2}
                      className="mt-1.5 flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
        </Section>
      )}

      <Section
        icon={<CreditCard aria-hidden className="size-5" />}
        title="Payment"
        description="This is a demo store — no real payment is processed and no card data is stored."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="mock.cardName" className="block text-sm font-medium text-foreground">
              Name on card
            </label>
            <Input id="mock.cardName" name="mock.cardName" className="mt-1.5" autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="mock.cardNumber" className="block text-sm font-medium text-foreground">
              Card number
            </label>
            <Input
              id="mock.cardNumber"
              name="mock.cardNumber"
              inputMode="numeric"
              placeholder="4242 4242 4242 4242"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="mock.expiry" className="block text-sm font-medium text-foreground">
              Expiry
            </label>
            <Input id="mock.expiry" name="mock.expiry" placeholder="MM/YY" className="mt-1.5" />
          </div>
          <div>
            <label htmlFor="mock.cvc" className="block text-sm font-medium text-foreground">
              CVC
            </label>
            <Input id="mock.cvc" name="mock.cvc" placeholder="123" className="mt-1.5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Mock payment — clicking “Place order” will not charge anything.
        </p>
      </Section>

      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  errors,
  type = "text",
  defaultValue,
  autoComplete,
  className,
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  className?: string;
}) {
  const error = errors[name];
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-1.5"
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function str(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
