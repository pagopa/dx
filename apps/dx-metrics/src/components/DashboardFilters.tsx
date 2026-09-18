"use client";

import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

import { ALL_REPOSITORIES, REPOSITORIES, TIME_INTERVALS } from "@/lib/config";
import { focusRing } from "@/lib/utils";

interface DashboardFiltersProps {
  mode?: DashboardFilterMode;
  onRepositoryChange?: (repo: string) => void;
  onTimeIntervalChange?: (days: number) => void;
  repository?: string;
  timeInterval?: number;
}

const showsRepositoryFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" ||
  mode === "repository-only" ||
  mode === "all-repositories-and-time";

const showsAllRepositoriesOption = (mode: DashboardFilterMode) =>
  mode === "all-repositories-and-time";

const showsTimeIntervalFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" ||
  mode === "time-only" ||
  mode === "all-repositories-and-time";

const selectClassName =
  "block w-full cursor-pointer rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#e6edf3] transition-colors focus-visible:border-green-500";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-gray-400";

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
            {showsAllRepositoriesOption(mode) && (
              <option value={ALL_REPOSITORIES}>All repositories</option>
            )}
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
