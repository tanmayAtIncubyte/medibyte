"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CredentialsFormProps = {
  mode: "login" | "register";
};

const COPY = {
  login: {
    endpoint: "/api/auth/login",
    submitLabel: "Sign in",
    pendingLabel: "Signing in…",
    fallbackError: "Invalid email or password.",
  },
  register: {
    endpoint: "/api/auth/register",
    submitLabel: "Create account",
    pendingLabel: "Creating account…",
    fallbackError: "We couldn't create your account.",
  },
} as const;

export function CredentialsForm({ mode }: CredentialsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const response = await submitCredentials(copy.endpoint, mode, formData);

    if (response.ok) {
      router.push("/");
      router.refresh();
      return;
    }

    const message = await readError(response, copy.fallbackError);
    setError(message);
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {mode === "register" && (
        <Field label="Full name" name="name" type="text" autoComplete="name" />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? copy.pendingLabel : copy.submitLabel}
      </Button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
};

function Field({ label, name, type, autoComplete }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Input name={name} type={type} autoComplete={autoComplete} required />
    </label>
  );
}

async function submitCredentials(
  endpoint: string,
  mode: "login" | "register",
  formData: FormData,
): Promise<Response> {
  const payload: Record<string, string> = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  if (mode === "register") {
    payload.name = String(formData.get("name") ?? "");
  }
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}
