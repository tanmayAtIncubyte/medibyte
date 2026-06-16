"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  BugCategory,
  BugDefinition,
  BugDifficulty,
} from "@/lib/bug-registry";
import type { BugFlags } from "@/lib/bug-flags";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
        <p className="truncate font-medium text-foreground">{bug.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge>{bug.category}</Badge>
          <Badge>{bug.difficulty}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{bug.key}</span>
        </div>
      </div>
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
