"use client";

import { RepositoryMultiSelect } from "@/components/RepositoryMultiSelect";
import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

import { REPOSITORIES, TIME_INTERVALS } from "@/lib/config";
import { focusRing } from "@/lib/utils";

interface DashboardFiltersProps {
  mode?: DashboardFilterMode;
  onRepositoriesChange?: (repositories: string[]) => void;
  onTimeIntervalChange?: (days: number) => void;
  repositories?: readonly string[];
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
  onRepositoriesChange,
  onTimeIntervalChange,
  repositories = [],
  timeInterval,
}: DashboardFiltersProps) {
  const showRepository = showsRepositoryFilter(mode);
  const showTimeInterval = showsTimeIntervalFilter(mode);

  return (
    <div className="mb-8 flex flex-col items-start gap-4 min-[1268px]:flex-row min-[1268px]:items-stretch">
      {showTimeInterval && (
        // A fixed width plus `shrink-0` keeps the time interval from narrowing
        // or drifting as the repository chips grow its neighbour; on narrow
        // viewports the columns stack and the width is harmless.
        <div className="flex w-44 shrink-0 flex-col min-[1268px]:self-stretch">
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
        </div>
      )}
      {showRepository && (
        // `min-w-0` lets this column absorb the leftover space and wrap its
        // chips instead of pushing into the time interval on wide viewports.
        <div className="w-full min-w-0">
          <RepositoryMultiSelect
            onChange={(next) => onRepositoriesChange?.(next)}
            options={REPOSITORIES}
            value={repositories}
          />
        </div>
      )}
    </div>
  );
}
