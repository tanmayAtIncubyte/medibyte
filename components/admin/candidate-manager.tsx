"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, History, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Reviewer console for time-boxed candidate access: mint a code, copy its
// /start link, extend a window, revoke it (reversibly), re-grant a fresh
// attempt, or hard-remove a candidate. Talks to the admin-guarded
// /api/admin/candidates routes. The roster is PERSISTENT: revoked/expired
// candidates stay listed so a reviewer can re-grant or remove them.

type Attempt = {
  attempt: number;
  grantedAt: string;
  windowDays: number;
  expiresAt: string;
  startedAt?: string;
  revokedAt?: string;
};

type CandidateRecord = {
  code: string;
  name: string;
  email: string;
  role?: string;
  notes?: string;
  createdAt: string;
  status: "active" | "revoked";
  attempts: Attempt[];
};

type DisplayStatus = "active" | "revoked" | "expired";

const DEFAULT_WINDOW_DAYS = 10;
const DEFAULT_EXTEND_DAYS = 5;

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
          No candidates yet. Mint an access link above to invite one.
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
        // Surface the server's message inline — notably a 409 on a duplicate
        // email (an active candidate already owns it).
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
          step={0.5}
          min={0.5}
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
            <th className="px-4 py-2.5">Access until</th>
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

function currentAttemptOf(candidate: CandidateRecord): Attempt {
  return candidate.attempts[candidate.attempts.length - 1];
}

function displayStatusOf(candidate: CandidateRecord): DisplayStatus {
  if (candidate.status === "revoked") {
    return "revoked";
  }
  const expiresAt = currentAttemptOf(candidate).expiresAt;
  return Date.now() >= Date.parse(expiresAt) ? "expired" : "active";
}

function CandidateRow({
  candidate,
  onChanged,
}: {
  candidate: CandidateRecord;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const currentAttempt = currentAttemptOf(candidate);
  const effectiveExpiresAt = currentAttempt.expiresAt;
  const displayStatus = displayStatusOf(candidate);

  const [extraDays, setExtraDays] = useState(String(DEFAULT_EXTEND_DAYS));
  const [regrantDays, setRegrantDays] = useState(String(currentAttempt.windowDays));

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/admin/candidates/${candidate.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function extend() {
    await patch({ action: "extend", extraDays: Number(extraDays) });
  }

  async function regrant() {
    await patch({ action: "regrant", windowDays: Number(regrantDays) });
  }

  async function remove() {
    if (
      !window.confirm(`Permanently remove ${candidate.name}? This frees their email.`)
    ) {
      return;
    }
    await patch({ action: "remove" });
  }

  async function revoke() {
    if (
      !window.confirm(
        `Revoke access for ${candidate.name}? They are locked out immediately.`,
      )
    ) {
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
        <div className="font-mono text-xs text-muted-foreground/80">{candidate.code}</div>
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
        <StatusCell displayStatus={displayStatus} attempts={candidate.attempts} />
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        <div>{formatDateTime(effectiveExpiresAt)}</div>
        <div className="text-xs text-muted-foreground/80">
          {remainingLabel(effectiveExpiresAt)}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {displayStatus === "active" ? (
            <>
              <div className="flex items-center gap-1.5">
                <DaysField
                  value={extraDays}
                  onChange={setExtraDays}
                  ariaLabel={`Extend by (days) for ${candidate.name}`}
                />
                <Button variant="outline" size="sm" onClick={extend} disabled={busy}>
                  Extend
                </Button>
              </div>
              <Button variant="destructive" size="sm" onClick={revoke} disabled={busy}>
                Revoke
              </Button>
              <CopyLinkButton code={candidate.code} />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <DaysField
                  value={regrantDays}
                  onChange={setRegrantDays}
                  ariaLabel={`Re-grant window (days) for ${candidate.name}`}
                />
                <Button variant="outline" size="sm" onClick={regrant} disabled={busy}>
                  Re-grant
                </Button>
              </div>
              <Button variant="destructive" size="sm" onClick={remove} disabled={busy}>
                Remove
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusCell({
  displayStatus,
  attempts,
}: {
  displayStatus: DisplayStatus;
  attempts: Attempt[];
}) {
  const attemptCount = attempts.length;
  const startedAt = attempts[attemptCount - 1]?.startedAt;
  const badgeClass =
    displayStatus === "active"
      ? "bg-primary/10 text-primary"
      : displayStatus === "revoked"
        ? "bg-destructive/10 text-destructive"
        : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  const label =
    displayStatus === "active"
      ? "Active"
      : displayStatus === "revoked"
        ? "Revoked"
        : "Expired";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            badgeClass,
          )}
        >
          {label}
        </span>
        <span className="inline-flex items-center rounded-full border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground">
          Attempt {attemptCount}
        </span>
        <HistoryPopover attempts={attempts} />
      </div>
      <span className="text-xs text-muted-foreground/80">
        {startedAt ? `Started ${formatDateTime(startedAt)}` : "Not started"}
      </span>
    </div>
  );
}

// ⓘ affordance: hover shows "View history"; click opens a card with the full
// attempt timeline (matches the bug-reference ⓘ Popover pattern).
function HistoryPopover({ attempts }: { attempts: Attempt[] }) {
  const count = attempts.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="View history"
          aria-label={`View history — ${count} attempt${count === 1 ? "" : "s"}`}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <History className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="mb-2.5 font-heading text-sm font-semibold text-foreground">
          Access history · {count} attempt{count === 1 ? "" : "s"}
        </p>
        <AttemptTimeline attempts={attempts} />
      </PopoverContent>
    </Popover>
  );
}

function AttemptTimeline({ attempts }: { attempts: Attempt[] }) {
  const count = attempts.length;
  const lastIndex = count - 1;

  return (
    <ol className="space-y-3 text-xs">
      {attempts.map((attempt, index) => {
          const chip = attempt.revokedAt
            ? { label: "Revoked", cls: "bg-destructive/10 text-destructive" }
            : index === lastIndex
              ? { label: "Current", cls: "bg-primary/10 text-primary" }
              : { label: "Ended", cls: "bg-muted text-muted-foreground" };
          return (
            <li key={attempt.attempt} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Attempt {attempt.attempt}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium",
                    chip.cls,
                  )}
                >
                  {chip.label}
                </span>
              </div>
              <div className="space-y-1 pl-0.5">
                <TimelineRow tone="bg-muted-foreground/50" label="Granted" time={attempt.grantedAt} />
                {attempt.startedAt && (
                  <TimelineRow tone="bg-primary" label="Started" time={attempt.startedAt} />
                )}
                {attempt.revokedAt && (
                  <TimelineRow tone="bg-destructive" label="Revoked" time={attempt.revokedAt} />
                )}
                {!attempt.startedAt && !attempt.revokedAt && (
                  <p className="pl-3.5 text-muted-foreground/60 italic">Not started yet</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
  );
}

function TimelineRow({ tone, label, time }: { tone: string; label: string; time: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className={cn("inline-block size-1.5 shrink-0 rounded-full", tone)} />
      <span className="w-14 shrink-0">{label}</span>
      <span className="tabular-nums text-muted-foreground/90">{formatDateTime(time)}</span>
    </div>
  );
}

// A days input with an inline "days" unit suffix, so the number's meaning is
// explicit (supports fractional windows, e.g. 0.5 = 12h).
function DaysField({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        step={0.5}
        min={0.5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-24 pr-11"
        aria-label={ariaLabel}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
        days
      </span>
    </div>
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
      // button as-is; the code sub-line still lets the reviewer copy manually.
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

function formatDateTime(iso?: string): string {
  if (!iso) {
    return "—";
  }
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

function remainingLabel(expiresAt: string): string {
  const msLeft = Date.parse(expiresAt) - Date.now();
  if (Number.isNaN(msLeft) || msLeft <= 0) {
    return "expired";
  }
  const totalMinutes = Math.floor(msLeft / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return `${days}d ${hours}h left`;
  }
  if (hours >= 1) {
    return `${hours}h left`;
  }
  return `${minutes}m left`;
}

// Retained per the console's helper set (date-only rendering).
void formatDate;
