"use client";

import { RepositoryMultiSelect } from "@/components/RepositoryMultiSelect";
import { useScope } from "@/components/ScopeProvider";
import type { DashboardFilterMode } from "@/lib/useDashboardFilters";

import { TIME_INTERVALS } from "@/lib/config";
import { addCalendarDays } from "@/lib/date-range";
import { focusRing } from "@/lib/utils";

interface DashboardFiltersProps {
  /** First calendar date the dashboard has data for (`YYYY-MM-DD`). */
  availableFrom?: string;
  /** Last calendar date the dashboard has data for (`YYYY-MM-DD`). */
  availableTo?: string;
  mode?: DashboardFilterMode;
  onRangeChange?: (start: string, end: string) => void;
  onRepositoriesChange?: (repositories: string[]) => void;
  /** End of the applied window (`YYYY-MM-DD`). */
  rangeEnd?: string;
  /** Start of the applied window (`YYYY-MM-DD`). */
  rangeStart?: string;
  repositories?: readonly string[];
}

const showsRepositoryFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "repository-only";

const showsTimeIntervalFilter = (mode: DashboardFilterMode) =>
  mode === "repository-and-time" || mode === "time-only";

const selectClassName =
  "block w-full cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function DashboardFilters({
  availableFrom,
  availableTo,
  mode = "repository-and-time",
  onRangeChange,
  onRepositoriesChange,
  rangeEnd,
  rangeStart,
  repositories = [],
}: DashboardFiltersProps) {
  const showRepository = showsRepositoryFilter(mode);
  const showTimeInterval = showsTimeIntervalFilter(mode);
  const { repositories: scopeRepositories } = useScope();
  // Presets end at the latest data point: "last 30 days" means the last 30 days
  // of imported data, the same anchor the trailing window used before the
  // custom range existed.
  const presetEnd = availableTo ?? rangeEnd;

  const handleStartChange = (next: string) => {
    if (!next) {
      return;
    }

    // Keep the pair ordered: moving the start past the end drags the end along
    // instead of producing an invalid range that the server would silently fix.
    const nextEnd =
      rangeEnd !== undefined && rangeEnd >= next ? rangeEnd : next;
    onRangeChange?.(next, nextEnd);
  };

  const handleEndChange = (next: string) => {
    if (!next) {
      return;
    }

    const nextStart =
      rangeStart !== undefined && rangeStart <= next ? rangeStart : next;
    onRangeChange?.(nextStart, next);
  };

  return (
    <div className="mb-8 flex flex-col items-start gap-4">
      {showTimeInterval && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col space-y-1.5">
              <span className={labelClassName}>From</span>
              <input
                aria-label="Range start"
                className={`${selectClassName} ${focusRing} w-40`}
                disabled={availableFrom === undefined}
                max={rangeEnd ?? availableTo}
                min={availableFrom}
                onChange={(event) => handleStartChange(event.target.value)}
                type="date"
                value={rangeStart ?? ""}
              />
            </label>
            <label className="flex flex-col space-y-1.5">
              <span className={labelClassName}>To</span>
              <input
                aria-label="Range end"
                className={`${selectClassName} ${focusRing} w-40`}
                disabled={availableTo === undefined}
                max={availableTo}
                min={rangeStart ?? availableFrom}
                onChange={(event) => handleEndChange(event.target.value)}
                type="date"
                value={rangeEnd ?? ""}
              />
            </label>
          </div>
          {presetEnd !== undefined && onRangeChange !== undefined && (
            // Quick shortcuts only fill the two dates: they do not reintroduce a
            // second source of truth for the window.
            <div className="flex flex-wrap gap-1">
              {TIME_INTERVALS.map((interval) => (
                <button
                  className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  key={interval.value}
                  onClick={() =>
                    onRangeChange(
                      addCalendarDays(presetEnd, -(interval.value - 1)),
                      presetEnd,
                    )
                  }
                  type="button"
                >
                  {interval.value}d
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {showRepository && (
        // Full width: the repository chips sit on their own row under the date
        // range instead of competing with it for horizontal space.
        <div className="w-full min-w-0">
          <RepositoryMultiSelect
            onChange={(next) => onRepositoriesChange?.(next)}
            options={scopeRepositories}
            value={repositories}
          />
        </div>
      )}
    </div>
  );
}
