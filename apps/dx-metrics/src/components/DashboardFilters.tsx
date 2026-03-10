"use client";

import { REPOSITORIES, TIME_INTERVALS } from "@/lib/config";
import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

interface DashboardFiltersProps {
  repository?: string;
  timeInterval?: number;
  onRepositoryChange?: (repo: string) => void;
  onTimeIntervalChange?: (days: number) => void;
  mode?: DashboardFilterMode;
}

const showsRepositoryFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "repository-only";

const showsTimeIntervalFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "time-only";

export function DashboardFilters({
  repository,
  timeInterval,
  onRepositoryChange,
  onTimeIntervalChange,
  mode = "repository-and-time",
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
            value={repository}
            onChange={(e) => onRepositoryChange?.(e.target.value)}
            className="block w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#e6edf3] focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all cursor-pointer"
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
            value={timeInterval}
            onChange={(e) => onTimeIntervalChange?.(Number(e.target.value))}
            className="block w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-[#e6edf3] focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all cursor-pointer"
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
