"use client";

import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

import { REPOSITORIES, TIME_INTERVALS } from "@/lib/config";
import { focusRing } from "@/lib/utils";

interface DashboardFiltersProps {
  mode?: DashboardFilterMode;
  onRepositoryChange?: (repo: string) => void;
  onTimeIntervalChange?: (days: number) => void;
  repository?: string;
  timeInterval?: number;
}

const showsRepositoryFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "repository-only";

const showsTimeIntervalFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "time-only";

const selectClassName =
  "block w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors focus-visible:border-accent";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function DashboardFilters({
  mode = "repository-and-time",
  onRepositoryChange,
  onTimeIntervalChange,
  repository,
  timeInterval,
}: DashboardFiltersProps) {
  const showRepository = showsRepositoryFilter(mode);
  const showTimeInterval = showsTimeIntervalFilter(mode);

  return (
    <div className="mb-8 flex flex-wrap items-end gap-6">
      {showRepository && (
        // The label wraps the control, so the select always has an accessible name.
        <label className="block space-y-1.5">
          <span className={labelClassName}>Repository</span>
          <select
            className={`${selectClassName} ${focusRing}`}
            onChange={(e) => onRepositoryChange?.(e.target.value)}
            value={repository}
          >
            {REPOSITORIES.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </label>
      )}
      {showTimeInterval && (
        <label className="block space-y-1.5">
          <span className={labelClassName}>Time Interval</span>
          <select
            className={`${selectClassName} ${focusRing}`}
            onChange={(e) => onTimeIntervalChange?.(Number(e.target.value))}
            value={timeInterval}
          >
            {TIME_INTERVALS.map((ti) => (
              <option key={ti.value} value={ti.value}>
                {ti.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
