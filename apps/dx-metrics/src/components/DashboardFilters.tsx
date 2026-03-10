"use client";

import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

import { REPOSITORIES, TIME_INTERVALS } from "@/lib/config";

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
    <div className="mb-8 flex flex-wrap gap-6 items-end">
      {showRepository && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Repository
          </label>
          <select
            className="block w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#e6edf3] focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all cursor-pointer"
            onChange={(e) => onRepositoryChange?.(e.target.value)}
            value={repository}
          >
            {REPOSITORIES.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>
      )}
      {showTimeInterval && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Time Interval
          </label>
          <select
            className="block w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#e6edf3] focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all cursor-pointer"
            onChange={(e) => onTimeIntervalChange?.(Number(e.target.value))}
            value={timeInterval}
          >
            {TIME_INTERVALS.map((ti) => (
              <option key={ti.value} value={ti.value}>
                {ti.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
