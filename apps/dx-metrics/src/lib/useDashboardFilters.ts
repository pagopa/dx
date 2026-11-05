"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useScope } from "@/components/ScopeProvider";
import { calendarDaysBetween, isCalendarDate } from "@/lib/date-range";

export type DashboardFilterMode =
  | "repository-and-time"
  | "repository-only"
  | "time-only";

interface DashboardFilterUpdates {
  end?: string;
  repositories?: string[];
  start?: string;
}

interface UseDashboardFiltersOptions {
  defaultDays?: number;
  mode?: DashboardFilterMode;
}

const DEFAULT_DAYS = 120;
const DEFAULT_MODE: DashboardFilterMode = "repository-and-time";

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const splitRepositories = (value: string): string[] =>
  value
    .split(",")
    .map((repository) => repository.trim())
    .filter((repository) => repository.length > 0);

/**
 * Resolves the selection from the URL. The rules mirror the API's
 * `resolveVisibleRepositories`: an out-of-scope value yields an empty selection,
 * never the whole scope, so the select and the dashboard cannot disagree.
 */
const resolveSelection = (
  rawRepositories: null | string,
  rawRepository: null | string,
  fallbackRepositories: readonly string[],
  sanitize: (repositories: readonly string[]) => string[],
): string[] => {
  if (rawRepositories !== null) {
    return sanitize(splitRepositories(rawRepositories));
  }

  if (rawRepository !== null) {
    return sanitize([rawRepository]);
  }

  return [...fallbackRepositories];
};

/** Reads a valid `YYYY-MM-DD` value, ignoring anything else in the URL. */
const readCalendarDate = (value: null | string): string | undefined =>
  value !== null && isCalendarDate(value) ? value : undefined;

export function useDashboardFilters({
  defaultDays = DEFAULT_DAYS,
  mode = DEFAULT_MODE,
}: UseDashboardFiltersOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { repositories: scopeRepositories } = useScope();

  /** Keeps only the repositories the scope allows, preserving the order. */
  const sanitizeRepositories = useCallback(
    (repositories: readonly string[]) => {
      const visible = new Set(scopeRepositories);
      return Array.from(
        new Set(repositories.filter((repository) => visible.has(repository))),
      );
    },
    [scopeRepositories],
  );

  const repositories = resolveSelection(
    searchParams.get("repositories"),
    searchParams.get("repository"),
    scopeRepositories,
    sanitizeRepositories,
  );

  const requestedDays = Number(searchParams.get("days"));
  const rawStart = readCalendarDate(searchParams.get("start"));
  const rawEnd = readCalendarDate(searchParams.get("end"));
  // A custom range wins over `days`. Both dates must be present: a half-range is
  // treated as "no range" and the server falls back to the trailing window.
  const hasRange = rawStart !== undefined && rawEnd !== undefined;
  const start = hasRange ? rawStart : undefined;
  const end = hasRange ? rawEnd : undefined;
  const days =
    start !== undefined && end !== undefined
      ? calendarDaysBetween(start, end)
      : isPositiveInteger(requestedDays)
        ? requestedDays
        : defaultDays;

  /**
   * Time parameters ready for `useDashboardData`. A custom range replaces the
   * trailing window entirely; `days` remains the fallback so legacy URLs and
   * first renders keep their previous behaviour.
   */
  const timeParams = useMemo<Record<string, number | string>>(() => {
    if (start !== undefined && end !== undefined) {
      const range: Record<string, number | string> = { end, start };
      return range;
    }

    const trailing: Record<string, number | string> = { days };
    return trailing;
  }, [days, end, start]);

  const updateFilters = useCallback(
    (newParams: DashboardFilterUpdates) => {
      const params = new URLSearchParams(searchParams.toString());

      // Drop the legacy single-repository alias: the canonical parameter below
      // replaces it, and leaving both would make the URL ambiguous.
      params.delete("repository");

      if (mode === "time-only") {
        params.delete("repositories");
      }

      if (mode === "repository-only") {
        params.delete("days");
        params.delete("end");
        params.delete("start");
      }

      if (mode !== "time-only") {
        const nextRepositories = sanitizeRepositories(
          newParams.repositories ?? repositories,
        );
        // Always write the parameter, even when empty, so an empty selection is
        // explicit in the URL and survives a refresh.
        params.set("repositories", nextRepositories.join(","));
      }

      if (
        mode !== "repository-only" &&
        newParams.start !== undefined &&
        newParams.end !== undefined
      ) {
        params.set("start", newParams.start);
        params.set("end", newParams.end);
        // The explicit range replaces the trailing window; keeping both would
        // hide which one wins.
        params.delete("days");
      }

      const queryString = params.toString();

      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [mode, pathname, repositories, router, sanitizeRepositories, searchParams],
  );

  const setRepositories = useCallback(
    (nextRepositories: readonly string[]) => {
      updateFilters({ repositories: [...nextRepositories] });
    },
    [updateFilters],
  );

  const setRange = useCallback(
    (nextStart: string, nextEnd: string) => {
      if (!isCalendarDate(nextStart) || !isCalendarDate(nextEnd)) {
        return;
      }

      updateFilters(
        nextStart <= nextEnd
          ? { end: nextEnd, start: nextStart }
          : { end: nextStart, start: nextEnd },
      );
    },
    [updateFilters],
  );

  return {
    days,
    end,
    repositories,
    setRange,
    setRepositories,
    start,
    timeParams,
  };
}
