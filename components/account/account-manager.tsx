"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, ShieldPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InsuranceInfo, SavedAddress } from "@/lib/account/types";

type FieldErrors = Record<string, string>;

/**
 * Account address (PII) + insurance (PHI) management. All edits go through the
 * inspectable PATCH /api/account endpoint, which resolves the owner from the
 * session — this component never sends a userId, so it can only ever edit the
 * signed-in user's own account. PHI/PII travels in the request body only.
 */
export function AccountManager({
  initialAddresses,
  initialInsurance,
  defaultFullName,
}: {
  initialAddresses: SavedAddress[];
  initialInsurance: InsuranceInfo;
  defaultFullName: string;
}) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [insurance, setInsurance] = useState(initialInsurance);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(false);

  async function patchAccount(body: unknown): Promise<{
    ok: boolean;
    account?: { addresses: SavedAddress[]; insurance: InsuranceInfo };
    errors?: FieldErrors;
  }> {
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      account?: { addresses: SavedAddress[]; insurance: InsuranceInfo };
      errors?: FieldErrors;
    };
    return { ok: res.ok, account: data.account, errors: data.errors };
  }

  return (
    <>
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="size-5" aria-hidden />
            <h2 className="font-heading text-lg font-semibold text-foreground">Saved addresses</h2>
          </div>
          {!addingAddress && editingAddressId === null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddingAddress(true)}
            >
              <Plus aria-hidden className="size-4" />
              Add address
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {addresses.length === 0 && !addingAddress && (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}

          {addresses.map((address) =>
            editingAddressId === address.id ? (
              <AddressForm
                key={address.id}
                heading="Edit address"
                initial={address}
                onCancel={() => setEditingAddressId(null)}
                onSubmit={async (input) => {
                  const result = await patchAccount({
                    kind: "address",
                    address: { ...input, id: address.id },
                  });
                  if (result.ok && result.account) {
                    setAddresses(result.account.addresses);
                    setEditingAddressId(null);
                  }
                  return result.errors ?? {};
                }}
              />
            ) : (
              <div
                key={address.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{address.label}</p>
                  <address className="mt-1 text-sm not-italic text-muted-foreground">
                    {address.fullName}
                    <br />
                    {address.street}
                    <br />
                    {address.city}, {address.region} {address.postalCode}
                    <br />
                    {address.country}
                  </address>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingAddressId(address.id)}
                  aria-label={`Edit ${address.label} address`}
                >
                  <Pencil aria-hidden className="size-4" />
                  Edit
                </Button>
              </div>
            ),
          )}

          {addingAddress && (
            <AddressForm
              heading="Add address"
              initial={{ fullName: defaultFullName }}
              onCancel={() => setAddingAddress(false)}
              onSubmit={async (input) => {
                const result = await patchAccount({ kind: "address", address: input });
                if (result.ok && result.account) {
                  setAddresses(result.account.addresses);
                  setAddingAddress(false);
                }
                return result.errors ?? {};
              }}
            />
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldPlus className="size-5" aria-hidden />
            <h2 className="font-heading text-lg font-semibold text-foreground">Insurance</h2>
          </div>
          {!editingInsurance && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingInsurance(true)}
            >
              <Pencil aria-hidden className="size-4" />
              Edit
            </Button>
          )}
        </div>

        {editingInsurance ? (
          <InsuranceForm
            initial={insurance}
            onCancel={() => setEditingInsurance(false)}
            onSubmit={async (input) => {
              const result = await patchAccount({ kind: "insurance", insurance: input });
              if (result.ok && result.account) {
                setInsurance(result.account.insurance);
                setEditingInsurance(false);
              }
              return result.errors ?? {};
            }}
          />
        ) : (
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Detail label="Provider" value={insurance.provider} />
            <Detail label="Member ID" value={insurance.memberId} />
            <Detail label="Group number" value={insurance.groupNumber} />
          </dl>
        )}
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value || "—"}</dd>
    </div>
  );
}

type AddressFormValues = {
  label: string;
  fullName: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

function AddressForm({
  heading,
  initial,
  onCancel,
  onSubmit,
}: {
  heading: string;
  initial: Partial<AddressFormValues>;
  onCancel: () => void;
  onSubmit: (input: AddressFormValues) => Promise<FieldErrors>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function handle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const errs = await onSubmit({
      label: str(form, "label"),
      fullName: str(form, "shipping.fullName"),
      street: str(form, "shipping.street"),
      city: str(form, "shipping.city"),
      region: str(form, "shipping.region"),
      postalCode: str(form, "shipping.postalCode"),
      country: str(form, "shipping.country"),
    });
    setErrors(errs);
    setBusy(false);
  }

  return (
    <form onSubmit={handle} noValidate className="rounded-lg border border-border p-4">
      <p className="text-sm font-semibold text-foreground">{heading}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <FormField name="label" label="Label" defaultValue={initial.label} errors={errors} errorKey="address.label" className="sm:col-span-2" />
        <FormField name="shipping.fullName" label="Full name" defaultValue={initial.fullName} errors={errors} className="sm:col-span-2" />
        <FormField name="shipping.street" label="Street address" defaultValue={initial.street} errors={errors} className="sm:col-span-2" />
        <FormField name="shipping.city" label="City" defaultValue={initial.city} errors={errors} />
        <FormField name="shipping.region" label="State / region" defaultValue={initial.region} errors={errors} />
        <FormField name="shipping.postalCode" label="Postal code" defaultValue={initial.postalCode} errors={errors} />
        <FormField name="shipping.country" label="Country" defaultValue={initial.country ?? "USA"} errors={errors} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function InsuranceForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: InsuranceInfo;
  onCancel: () => void;
  onSubmit: (input: InsuranceInfo) => Promise<FieldErrors>;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function handle(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const errs = await onSubmit({
      provider: str(form, "insurance.provider"),
      memberId: str(form, "insurance.memberId"),
      groupNumber: str(form, "insurance.groupNumber"),
    });
    setErrors(errs);
    setBusy(false);
  }

  return (
    <form onSubmit={handle} noValidate className="mt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField name="insurance.provider" label="Provider" defaultValue={initial.provider} errors={errors} />
        <FormField name="insurance.memberId" label="Member ID" defaultValue={initial.memberId} errors={errors} />
        <FormField name="insurance.groupNumber" label="Group number" defaultValue={initial.groupNumber} errors={errors} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FormField({
  name,
  label,
  errors,
  errorKey,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  errors: FieldErrors;
  errorKey?: string;
  defaultValue?: string;
  className?: string;
}) {
  const key = errorKey ?? name;
  const error = errors[key];
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
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
