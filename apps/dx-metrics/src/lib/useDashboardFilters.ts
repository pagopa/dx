"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { DEFAULT_REPOSITORY, REPOSITORIES } from "@/lib/config";

export type DashboardFilterMode =
  "repository-and-time" | "repository-only" | "time-only";

interface DashboardFilterUpdates {
  days?: number;
  repositories?: string[];
}

interface UseDashboardFiltersOptions {
  defaultDays?: number;
  /**
   * Repositories selected when the URL carries no repository parameter.
   * Defaults to the single configured default repository.
   */
  defaultRepositories?: readonly string[];
  mode?: DashboardFilterMode;
}

const DEFAULT_DAYS = 120;
const DEFAULT_MODE: DashboardFilterMode = "repository-and-time";

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

/** Keeps only known repositories, preserving the caller's order. */
const sanitizeRepositories = (repositories: readonly string[]): string[] =>
  repositories.filter((repository) => REPOSITORIES.includes(repository));

/**
 * Resolves the selection from the URL.
 *
 * `repositories` is the canonical parameter: absent falls back to the default,
 * while an explicitly empty value means "no repository selected" and yields an
 * empty result set. `repository` is the legacy single-value alias, honoured so
 * old bookmarks keep working.
 */
const resolveRepositories = (
  rawRepositories: null | string,
  rawRepository: null | string,
  fallbackRepositories: readonly string[],
): string[] => {
  if (rawRepositories !== null) {
    return sanitizeRepositories(
      rawRepositories
        .split(",")
        .map((repository) => repository.trim())
        .filter((repository) => repository.length > 0),
    );
  }

  if (rawRepository !== null) {
    return REPOSITORIES.includes(rawRepository)
      ? [rawRepository]
      : [...fallbackRepositories];
  }

  return [...fallbackRepositories];
};

export function useDashboardFilters({
  defaultDays = DEFAULT_DAYS,
  defaultRepositories = [DEFAULT_REPOSITORY],
  mode = DEFAULT_MODE,
}: UseDashboardFiltersOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const sanitizedDefaults = sanitizeRepositories(defaultRepositories);
  const resolvedDefaultRepositories =
    sanitizedDefaults.length > 0 ? sanitizedDefaults : [DEFAULT_REPOSITORY];

  const repositories = resolveRepositories(
    searchParams.get("repositories"),
    searchParams.get("repository"),
    resolvedDefaultRepositories,
  );
  const requestedDays = Number(searchParams.get("days"));
  const days = isPositiveInteger(requestedDays) ? requestedDays : defaultDays;

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
      }

      if (mode !== "time-only") {
        const nextRepositories = sanitizeRepositories(
          newParams.repositories ?? repositories,
        );
        // Always write the parameter, even when empty, so an empty selection is
        // explicit in the URL and survives a refresh.
        params.set("repositories", nextRepositories.join(","));
      }

      if (mode !== "repository-only" && newParams.days !== undefined) {
        params.set("days", newParams.days.toString());
      }

      const queryString = params.toString();

      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [mode, pathname, repositories, router, searchParams],
  );

  const setRepositories = useCallback(
    (nextRepositories: readonly string[]) => {
      updateFilters({ repositories: [...nextRepositories] });
    },
    [updateFilters],
  );

  const setDays = useCallback(
    (nextDays: number) => {
      updateFilters({
        days: isPositiveInteger(nextDays) ? nextDays : defaultDays,
      });
    },
    [defaultDays, updateFilters],
  );

  return {
    days,
    repositories,
    setDays,
    setRepositories,
  };
}
