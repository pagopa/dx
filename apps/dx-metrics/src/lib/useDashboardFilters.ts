"use client";

import { DEFAULT_REPOSITORY, REPOSITORIES } from "@/lib/config";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type DashboardFilterMode =
  | "repository-and-time"
  | "repository-only"
  | "time-only";

interface UseDashboardFiltersOptions {
  defaultRepository?: string;
  defaultDays?: number;
  mode?: DashboardFilterMode;
}

interface DashboardFilterUpdates {
  repository?: string;
  days?: number;
}

const DEFAULT_DAYS = 120;
const DEFAULT_MODE: DashboardFilterMode = "repository-and-time";

const isPositiveInteger = (value: number) =>
  Number.isInteger(value) && value > 0;

const getValidRepository = (repository: string | null, fallbackRepository: string) =>
  repository && REPOSITORIES.includes(repository)
    ? repository
    : fallbackRepository;

export function useDashboardFilters({
  defaultRepository = DEFAULT_REPOSITORY,
  defaultDays = DEFAULT_DAYS,
  mode = DEFAULT_MODE,
}: UseDashboardFiltersOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const resolvedDefaultRepository = getValidRepository(
    defaultRepository,
    DEFAULT_REPOSITORY,
  );
  const repository = getValidRepository(
    searchParams.get("repository"),
    resolvedDefaultRepository,
  );
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
        params.set(
          "repository",
          getValidRepository(
            newParams.repository ?? repository,
            resolvedDefaultRepository,
          ),
        );
      }

      if (mode !== "repository-only" && newParams.days !== undefined) {
        params.set("days", newParams.days.toString());
      }

      const queryString = params.toString();

      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [mode, pathname, repository, resolvedDefaultRepository, router, searchParams],
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
    repository,
    days,
    setRepository,
    setDays,
  };
}
