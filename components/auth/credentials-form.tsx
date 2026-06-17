"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CredentialsFormProps = {
  mode: "login" | "register";
  // SEC_CREDS_IN_URL: when set, submit the login as a GET with the credentials
  // in the query string (visible in the URL bar / history / Network) instead of
  // a POST body. Default false (clean POST). Login only.
  credentialsInUrl?: boolean;
  // SEC_TOKEN_LOCALSTORAGE: when set, copy the signed-in identity into
  // localStorage on success (XSS-exfiltratable) in addition to the httpOnly
  // session cookie. Default false (cookie only). Login only.
  persistIdentityToLocalStorage?: boolean;
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

export function CredentialsForm({
  mode,
  credentialsInUrl = false,
  persistIdentityToLocalStorage = false,
}: CredentialsFormProps) {
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
    const response = await submitCredentials(
      copy.endpoint,
      mode,
      formData,
      credentialsInUrl,
    );

    if (response.ok) {
      if (persistIdentityToLocalStorage) {
        // SEC_TOKEN_LOCALSTORAGE: stash the identity client-side where any XSS
        // can read it. The clean flow relies on the httpOnly cookie only.
        await persistIdentity(response);
      }
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
  credentialsInUrl: boolean,
): Promise<Response> {
  const payload: Record<string, string> = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  if (mode === "register") {
    payload.name = String(formData.get("name") ?? "");
  }

  // SEC_CREDS_IN_URL: send the credentials as a GET query string. They now show
  // up in the URL, browser history, referrer, and server access logs.
  if (credentialsInUrl) {
    const query = new URLSearchParams(payload).toString();
    return fetch(`${endpoint}?${query}`, { method: "GET" });
  }

  // Clean default: credentials travel in the POST body only.
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// SEC_TOKEN_LOCALSTORAGE: persist the returned identity into localStorage. This
// duplicates the session into JS-readable storage where any XSS can exfiltrate
// it; the clean flow never does this (the httpOnly cookie is the only token).
async function persistIdentity(response: Response): Promise<void> {
  try {
    const body = (await response.clone().json().catch(() => null)) as
      | { user?: unknown }
      | null;
    if (body?.user && typeof window !== "undefined") {
      window.localStorage.setItem("mb_identity", JSON.stringify(body.user));
    }
  } catch {
    // Best-effort; never block sign-in on the (buggy) side effect.
  }
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
