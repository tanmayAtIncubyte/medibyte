"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Reviewer console for time-boxed candidate access: mint a code, copy its
// /start link, extend a window, or revoke it. Talks to the admin-guarded
// /api/admin/candidates routes; the KV key's TTL is the single source of
// truth, so the list only ever shows LIVE candidates.

type CandidateRecord = {
  code: string;
  name: string;
  email: string;
  role?: string;
  notes?: string;
  createdAt: string;
  expiresAt: string;
  startedAt?: string;
};

const DEFAULT_WINDOW_DAYS = 10;
const EXTEND_DAYS = 10;

type ListResult = { candidates: CandidateRecord[]; error: string | null };

async function fetchCandidates(): Promise<ListResult> {
  try {
    const response = await fetch("/api/admin/candidates");
    if (!response.ok) {
      throw new Error("Failed to load candidates");
    }
    const data = (await response.json()) as { candidates: CandidateRecord[] };
    return { candidates: data.candidates, error: null };
  } catch {
    return {
      candidates: [],
      error: "Could not load candidates. Refresh to try again.",
    };
  }
}

export function CandidateManager() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyResult = useCallback((result: ListResult) => {
    setCandidates(result.candidates);
    setError(result.error);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    applyResult(await fetchCandidates());
  }, [applyResult]);

  useEffect(() => {
    // setState happens in the promise callback, never synchronously in the
    // effect body.
    void fetchCandidates().then(applyResult);
  }, [applyResult]);

  return (
    <div className="space-y-6">
      <MintForm onMinted={refresh} />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading candidates…
        </p>
      ) : candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No active candidates. Mint an access link above to invite one.
        </p>
      ) : (
        <CandidateTable candidates={candidates} onChanged={refresh} />
      )}
    </div>
  );
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MintForm({ onMinted }: { onMinted: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [windowDays, setWindowDays] = useState(String(DEFAULT_WINDOW_DAYS));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 && EMAIL_SHAPE.test(email.trim()) && !submitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: role.trim() || undefined,
          notes: notes.trim() || undefined,
          windowDays: Number(windowDays),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to create access link");
      }
      setName("");
      setEmail("");
      setRole("");
      setNotes("");
      setWindowDays(String(DEFAULT_WINDOW_DAYS));
      await onMinted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create access link");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="candidate-name" className="text-xs font-medium text-muted-foreground">
          Candidate name
        </label>
        <Input
          id="candidate-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Priya Sharma"
          maxLength={80}
          required
        />
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="candidate-email" className="text-xs font-medium text-muted-foreground">
          Email
        </label>
        <Input
          id="candidate-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="e.g. priya@example.com"
          maxLength={120}
          required
        />
      </div>
      <div className="flex min-w-40 flex-1 flex-col gap-1.5">
        <label htmlFor="candidate-role" className="text-xs font-medium text-muted-foreground">
          Role / position <span className="font-normal">(optional)</span>
        </label>
        <Input
          id="candidate-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="e.g. Senior QA"
          maxLength={80}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="candidate-window" className="text-xs font-medium text-muted-foreground">
          Window (days)
        </label>
        <Input
          id="candidate-window"
          type="number"
          min={1}
          max={60}
          value={windowDays}
          onChange={(event) => setWindowDays(event.target.value)}
          className="w-28"
          required
        />
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor="candidate-notes" className="text-xs font-medium text-muted-foreground">
          Internal notes <span className="font-normal">(optional, reviewer-only)</span>
        </label>
        <textarea
          id="candidate-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Referred by Anita — round 2"
          maxLength={500}
          rows={2}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      <Button type="submit" disabled={!canSubmit}>
        {submitting ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Plus aria-hidden />
        )}
        Create access link
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function CandidateTable({
  candidates,
  onChanged,
}: {
  candidates: CandidateRecord[];
  onChanged: () => Promise<void>;
}) {
  return (
    <section className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-4 py-2.5">Name</th>
            <th className="px-4 py-2.5">Email</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Code</th>
            <th className="px-4 py-2.5">Expires</th>
            <th className="px-4 py-2.5">Start link</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {candidates.map((candidate) => (
            <CandidateRow
              key={candidate.code}
              candidate={candidate}
              onChanged={onChanged}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CandidateRow({
  candidate,
  onChanged,
}: {
  candidate: CandidateRecord;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function extend() {
    setBusy(true);
    try {
      await fetch(`/api/admin/candidates/${candidate.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraDays: EXTEND_DAYS }),
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm(`Revoke access for ${candidate.name}? They are locked out immediately.`)) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/admin/candidates/${candidate.code}`, { method: "DELETE" });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-foreground">{candidate.name}</div>
        {candidate.role && (
          <div className="text-xs text-muted-foreground">{candidate.role}</div>
        )}
        {candidate.notes && (
          <div
            className="mt-0.5 max-w-52 truncate text-xs text-muted-foreground/80"
            title={candidate.notes}
          >
            {candidate.notes}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">{candidate.email}</td>
      <td className="px-4 py-3 align-top">
        <StatusBadge startedAt={candidate.startedAt} />
      </td>
      <td className="px-4 py-3 align-top font-mono text-xs text-muted-foreground">
        {candidate.code}
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        {formatDate(candidate.expiresAt)}
        <span className="ml-1.5 text-xs text-muted-foreground/80">
          ({daysLeftLabel(candidate.expiresAt)})
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <CopyLinkButton code={candidate.code} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={extend} disabled={busy}>
            Extend +{EXTEND_DAYS} days
          </Button>
          <Button variant="destructive" size="sm" onClick={revoke} disabled={busy}>
            Revoke
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ startedAt }: { startedAt?: string }) {
  if (!startedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Not started
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
      title={`Started ${formatDateTime(startedAt)}`}
    >
      Started {formatDateTime(startedAt)}
    </span>
  );
}

function CopyLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const link = `${window.location.origin}/start?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the
      // button as-is; the code column still lets the reviewer copy manually.
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className={cn(copied && "text-primary")}
      aria-label={`Copy start link for ${code}`}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function daysLeftLabel(expiresAt: string): string {
  const msLeft = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(msLeft) || msLeft <= 0) {
    return "expired";
  }
  const days = Math.ceil(msLeft / 86_400_000);
  return `${days}d left`;
}
