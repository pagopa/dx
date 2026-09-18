"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
  ALL_REPOSITORIES,
  DEFAULT_REPOSITORY,
  REPOSITORIES,
} from "@/lib/config";

export type DashboardFilterMode =
  | "all-repositories-and-time"
  | "repository-and-time"
  | "repository-only"
  | "time-only";

interface DashboardFilterUpdates {
  days?: number;
  repository?: string;
}

interface UseDashboardFiltersOptions {
  defaultDays?: number;
  defaultRepository?: string;
  mode?: DashboardFilterMode;
}

const DEFAULT_DAYS = 120;
const DEFAULT_MODE: DashboardFilterMode = "repository-and-time";

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const getValidRepository = (
  repository: null | string,
  fallbackRepository: string,
) =>
  repository && REPOSITORIES.includes(repository)
    ? repository
    : fallbackRepository;

/** `all-repositories-and-time` accepts the sentinel in addition to real names. */
const getValidAggregateRepository = (repository: null | string): string =>
  repository === ALL_REPOSITORIES || (repository !== null && REPOSITORIES.includes(repository))
    ? repository
    : ALL_REPOSITORIES;

export function useDashboardFilters({
  defaultDays = DEFAULT_DAYS,
  defaultRepository = DEFAULT_REPOSITORY,
  mode = DEFAULT_MODE,
}: UseDashboardFiltersOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isAggregate = mode === "all-repositories-and-time";
  const resolvedDefaultRepository = isAggregate
    ? ALL_REPOSITORIES
    : getValidRepository(defaultRepository, DEFAULT_REPOSITORY);
  const repository = isAggregate
    ? getValidAggregateRepository(searchParams.get("repository"))
    : getValidRepository(searchParams.get("repository"), resolvedDefaultRepository);
  const requestedDays = Number(searchParams.get("days"));
  const days = isPositiveInteger(requestedDays) ? requestedDays : defaultDays;

  const updateFilters = useCallback(
    (newParams: DashboardFilterUpdates) => {
      const params = new URLSearchParams(searchParams.toString());

      if (mode === "time-only") {
        params.delete("repository");
      }

      if (mode === "repository-only") {
        params.delete("days");
      }

      if (mode !== "time-only") {
        const nextRepository = newParams.repository ?? repository;
        params.set(
          "repository",
          isAggregate
            ? getValidAggregateRepository(nextRepository)
            : getValidRepository(nextRepository, resolvedDefaultRepository),
        );
      }

      if (mode !== "repository-only" && newParams.days !== undefined) {
        params.set("days", newParams.days.toString());
      }

      const queryString = params.toString();

      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [
      isAggregate,
      mode,
      pathname,
      repository,
      resolvedDefaultRepository,
      router,
      searchParams,
    ],
  );

  const setRepository = useCallback(
    (nextRepository: string) => {
      updateFilters({ repository: nextRepository });
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
    repository,
    setDays,
    setRepository,
  };
}
