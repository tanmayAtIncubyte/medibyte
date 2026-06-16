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

type FieldErrorMap = Record<string, string>;

export function CredentialsForm({ mode }: CredentialsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const response = await submitCredentials(copy.endpoint, mode, formData);

    if (response.ok) {
      router.push("/");
      router.refresh();
      return;
    }

    const { message, errors } = await readError(response, copy.fallbackError);
    // Field-level errors are surfaced inline; the summary covers everything else
    // (e.g. duplicate email, bad credentials) so a reason is always shown.
    if (errors && Object.keys(errors).length > 0) {
      setFieldErrors(errors);
    } else {
      setError(message);
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {mode === "register" && (
        <Field
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          error={fieldErrors.name}
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={fieldErrors.password}
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
  error?: string;
};

function Field({ label, name, type, autoComplete, error }: FieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      />
      {error && (
        <span id={errorId} role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      )}
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

async function readError(
  response: Response,
  fallback: string,
): Promise<{ message: string; errors?: FieldErrorMap }> {
  const body = (await response.json().catch(() => null)) as
    | { error?: string; errors?: FieldErrorMap }
    | null;
  return { message: body?.error ?? fallback, errors: body?.errors };
}
