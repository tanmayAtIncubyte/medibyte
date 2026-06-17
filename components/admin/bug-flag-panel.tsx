"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageOff, Info, X, ZoomIn } from "lucide-react";

import type {
  BugCategory,
  BugDefinition,
  BugDifficulty,
} from "@/lib/bug-registry";
import type { BugFlags } from "@/lib/bug-flags";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type GroupBy = "none" | "category" | "difficulty";
type CategoryFilter = BugCategory | "all";
type DifficultyFilter = BugDifficulty | "all";

const CATEGORIES: BugCategory[] = [
  "functional",
  "accessibility",
  "performance",
  "security",
  "ui",
  "ux",
];

const DIFFICULTIES: BugDifficulty[] = [
  "easy",
  "moderate",
  "difficult",
  "expert",
];

export function BugFlagPanel({
  bugs,
  initialFlags,
}: {
  bugs: BugDefinition[];
  initialFlags: BugFlags;
}) {
  const router = useRouter();
  const [flags, setFlags] = useState<BugFlags>(initialFlags);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [isPending, startTransition] = useTransition();

  const visibleBugs = useMemo(
    () => bugs.filter((bug) => matchesFilters(bug, category, difficulty)),
    [bugs, category, difficulty],
  );

  const groups = useMemo(() => groupBugs(visibleBugs, groupBy), [visibleBugs, groupBy]);

  function persist(action: () => Promise<Response>, optimistic: (current: BugFlags) => BugFlags) {
    setFlags(optimistic);
    startTransition(async () => {
      const response = await action();
      if (response.ok) {
        setFlags(await response.json());
      }
      router.refresh();
    });
  }

  function toggleBug(key: string, enabled: boolean) {
    persist(
      () => postFlags({ key, enabled }),
      (current) => ({ ...current, [key]: enabled }),
    );
  }

  function resetAll() {
    persist(
      () => postFlags({ reset: true }),
      (current) => mapValues(current, () => false),
    );
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Toolbar
        category={category}
        difficulty={difficulty}
        groupBy={groupBy}
        enabledCount={enabledCount}
        totalCount={bugs.length}
        isPending={isPending}
        onCategoryChange={setCategory}
        onDifficultyChange={setDifficulty}
        onGroupByChange={setGroupBy}
        onReset={resetAll}
      />

      {visibleBugs.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((group) => (
          <BugGroup
            key={group.label}
            label={group.label}
            bugs={group.bugs}
            flags={flags}
            disabled={isPending}
            onToggle={toggleBug}
          />
        ))
      )}
    </div>
  );
}

function Toolbar({
  category,
  difficulty,
  groupBy,
  enabledCount,
  totalCount,
  isPending,
  onCategoryChange,
  onDifficultyChange,
  onGroupByChange,
  onReset,
}: {
  category: CategoryFilter;
  difficulty: DifficultyFilter;
  groupBy: GroupBy;
  enabledCount: number;
  totalCount: number;
  isPending: boolean;
  onCategoryChange: (value: CategoryFilter) => void;
  onDifficultyChange: (value: DifficultyFilter) => void;
  onGroupByChange: (value: GroupBy) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
      <SelectField
        label="Category"
        value={category}
        options={[["all", "All categories"], ...CATEGORIES.map(labelPair)]}
        onChange={(value) => onCategoryChange(value as CategoryFilter)}
      />
      <SelectField
        label="Difficulty"
        value={difficulty}
        options={[["all", "All difficulties"], ...DIFFICULTIES.map(labelPair)]}
        onChange={(value) => onDifficultyChange(value as DifficultyFilter)}
      />
      <SelectField
        label="Group by"
        value={groupBy}
        options={[
          ["none", "No grouping"],
          ["category", "Category"],
          ["difficulty", "Difficulty"],
        ]}
        onChange={(value) => onGroupByChange(value as GroupBy)}
      />
      <div className="ml-auto flex items-center gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {enabledCount} of {totalCount} enabled
        </p>
        <Button variant="outline" size="sm" onClick={onReset} disabled={isPending}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function BugGroup({
  label,
  bugs,
  flags,
  disabled,
  onToggle,
}: {
  label: string;
  bugs: BugDefinition[];
  flags: BugFlags;
  disabled: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      {label !== UNGROUPED && (
        <h2 className="border-b border-border px-4 py-2.5 font-heading text-sm font-semibold text-foreground">
          {label}
        </h2>
      )}
      <ul className="divide-y divide-border">
        {bugs.map((bug) => (
          <BugRow
            key={bug.key}
            bug={bug}
            enabled={flags[bug.key] === true}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  );
}

function BugRow({
  bug,
  enabled,
  disabled,
  onToggle,
}: {
  bug: BugDefinition;
  enabled: boolean;
  disabled: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{bug.title}</p>
          <BugInfo bug={bug} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge>{bug.category}</Badge>
          <Badge>{bug.difficulty}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{bug.key}</span>
        </div>
      </div>
      <BugPreview bug={bug} />
      <span
        className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums"
        aria-hidden
      >
        {enabled ? "On" : "Off"}
      </span>
      <Switch
        checked={enabled}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(bug.key, checked)}
        aria-label={`Toggle ${bug.title}`}
      />
    </li>
  );
}

// The ⓘ info affordance: a Popover (click + keyboard accessible) that surfaces
// the reviewer-facing effect / where / how-to-spot enrichment for a bug.
function BugInfo({ bug }: { bug: BugDefinition }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Details for ${bug.title}`}
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="space-y-2.5">
        <p className="font-heading text-sm font-semibold text-foreground">{bug.title}</p>
        <DetailRow label="Effect">{bug.effect ?? "—"}</DetailRow>
        <DetailRow label="Where">{bug.where ?? bug.location}</DetailRow>
        <DetailRow label="How to spot">{bug.howToSpot ?? "—"}</DetailRow>
      </PopoverContent>
    </Popover>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-xs">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

type Variant = "clean" | "buggy";

function imageSrc(bugKey: string, variant: Variant): string {
  return `/api/admin/bug-image/${encodeURIComponent(bugKey)}?variant=${variant}`;
}

const VARIANT_LABEL: Record<Variant, string> = {
  buggy: "Buggy (customer)",
  clean: "Clean (admin)",
};

// The Preview control: opens a WIDE Dialog showing one screenshot at a readable
// size, with a Buggy/Clean toggle and a click-to-zoom lightbox for pixel-level
// detail. Images load from the admin-guarded route; a not-yet-captured shot
// degrades to a "Screenshot pending" placeholder.
function BugPreview({ bug }: { bug: BugDefinition }) {
  const [variant, setVariant] = useState<Variant>("buggy");
  const [zoomed, setZoomed] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-label={`Preview ${bug.title}`}
        >
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(96vw,1500px)]">
        <DialogHeader>
          <DialogTitle>{bug.title}</DialogTitle>
          <DialogDescription>{bug.effect ?? bug.location}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Screenshot variant"
            className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
          >
            {(["buggy", "clean"] as Variant[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={variant === v}
                onClick={() => setVariant(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  variant === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {VARIANT_LABEL[v]}
              </button>
            ))}
          </div>
          <a
            href={imageSrc(bug.key, variant)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Open full size <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>

        {/* key on variant remounts so the placeholder state resets per variant */}
        <PreviewImage
          key={variant}
          bugKey={bug.key}
          variant={variant}
          onZoom={() => setZoomed(true)}
        />

        {zoomed && (
          <Lightbox
            src={imageSrc(bug.key, variant)}
            alt={`${VARIANT_LABEL[variant]} screenshot of ${bug.key}`}
            onClose={() => setZoomed(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewImage({
  bugKey,
  variant,
  onZoom,
}: {
  bugKey: string;
  variant: Variant;
  onZoom: () => void;
}) {
  // If the PNG hasn't been captured, the route 404s and onError swaps in the
  // placeholder — so the panel works before any screenshots exist.
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div
        className="flex h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
        role="img"
        aria-label={`${VARIANT_LABEL[variant]} screenshot pending`}
      >
        <ImageOff className="size-6" aria-hidden />
        <span>Screenshot pending</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onZoom}
      className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted/30 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="Zoom screenshot to full size"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only, dynamic guarded route, not a public asset */}
      <img
        src={imageSrc(bugKey, variant)}
        alt={`${VARIANT_LABEL[variant]} screenshot of ${bugKey}`}
        className="mx-auto max-h-[68vh] w-auto max-w-full object-contain"
        onError={() => setMissing(true)}
      />
      <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        <ZoomIn className="size-3.5" aria-hidden /> Click to zoom
      </span>
    </button>
  );
}

// Full-screen lightbox for pixel-level inspection. Esc closes it (captured so it
// doesn't also close the parent Dialog); backdrop click closes too.
function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Full-size screenshot"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only, dynamic guarded route */}
      <img
        src={src}
        alt={alt}
        className="max-h-[92vh] max-w-[96vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Close full-size view"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize">
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No bugs match the current filters.
    </p>
  );
}

const UNGROUPED = "__ungrouped__";

function matchesFilters(
  bug: BugDefinition,
  category: CategoryFilter,
  difficulty: DifficultyFilter,
): boolean {
  const categoryOk = category === "all" || bug.category === category;
  const difficultyOk = difficulty === "all" || bug.difficulty === difficulty;
  return categoryOk && difficultyOk;
}

function groupBugs(
  bugs: BugDefinition[],
  groupBy: GroupBy,
): { label: string; bugs: BugDefinition[] }[] {
  if (groupBy === "none") {
    return [{ label: UNGROUPED, bugs }];
  }
  const buckets = new Map<string, BugDefinition[]>();
  for (const bug of bugs) {
    const label = capitalize(bug[groupBy]);
    const bucket = buckets.get(label) ?? [];
    bucket.push(bug);
    buckets.set(label, bucket);
  }
  return [...buckets.entries()].map(([label, grouped]) => ({ label, bugs: grouped }));
}

function postFlags(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/admin/bug-flags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function labelPair(value: string): [string, string] {
  return [value, capitalize(value)];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapValues(flags: BugFlags, transform: (value: boolean) => boolean): BugFlags {
  return Object.fromEntries(
    Object.entries(flags).map(([key, value]) => [key, transform(value)]),
  );
}
