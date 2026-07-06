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
  createdAt: string;
  expiresAt: string;
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

function MintForm({ onMinted }: { onMinted: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [windowDays, setWindowDays] = useState(String(DEFAULT_WINDOW_DAYS));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), windowDays: Number(windowDays) }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to create access link");
      }
      setName("");
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
      <div className="flex min-w-56 flex-1 flex-col gap-1.5">
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
      <Button type="submit" disabled={submitting || name.trim().length === 0}>
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
            <th className="px-4 py-2.5">Code</th>
            <th className="px-4 py-2.5">Created</th>
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
      <td className="px-4 py-3 font-medium text-foreground">{candidate.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {candidate.code}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(candidate.createdAt)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(candidate.expiresAt)}
        <span className="ml-1.5 text-xs text-muted-foreground/80">
          ({daysLeftLabel(candidate.expiresAt)})
        </span>
      </td>
      <td className="px-4 py-3">
        <CopyLinkButton code={candidate.code} />
      </td>
      <td className="px-4 py-3">
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

function daysLeftLabel(expiresAt: string): string {
  const msLeft = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(msLeft) || msLeft <= 0) {
    return "expired";
  }
  const days = Math.ceil(msLeft / 86_400_000);
  return `${days}d left`;
}
