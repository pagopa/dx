"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Dashboard payloads are refreshed by the importer, not per request, so keeping
 * them in memory for a short window makes navigating between dashboards instant
 * and removes redundant database work. The server still owns the authoritative
 * `s-maxage` policy; this only avoids re-fetching within one session.
 */
const CLIENT_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  storedAt: number;
}

const dashboardCache = new Map<string, CacheEntry>();

const readCache = <T>(key: string): null | T => {
  const entry = dashboardCache.get(key);

  if (
    entry === undefined ||
    Date.now() - entry.storedAt > CLIENT_CACHE_TTL_MS
  ) {
    return null;
  }

  return entry.data as T;
};

const writeCache = (key: string, data: unknown): void => {
  dashboardCache.set(key, { data, storedAt: Date.now() });
};

const buildDashboardQueryString = (
  params: Record<string, number | string | readonly string[]>,
) => {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .forEach(([key, value]) => {
      // Arrays (e.g. the repository selection) travel as a comma-separated
      // value, matching the API route's `repositories` parameter.
      searchParams.set(
        key,
        Array.isArray(value) ? value.join(",") : String(value),
      );
    });

  return searchParams.toString();
};

const extractDashboardErrorMessage = async (response: Response) => {
  const fallbackMessage = `Request failed with status ${response.status}`;
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return fallbackMessage;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallbackMessage;
};

export function useDashboardData<T>(
  endpoint: string,
  params: Record<string, number | string | readonly string[]>,
) {
  const paramsSerialized = useMemo(
    () =>
      JSON.stringify(
        Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
      ),
    [params],
  );

  const queryString = useMemo(
    () => buildDashboardQueryString(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsSerialized],
  );

  const cacheKey = queryString ? `${endpoint}?${queryString}` : endpoint;

  const [data, setData] = useState<null | T>(() => readCache<T>(cacheKey));
  const [loading, setLoading] = useState(() => readCache(cacheKey) === null);
  const [error, setError] = useState<null | string>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal, options?: { force?: boolean }) => {
      const cached = readCache<T>(cacheKey);

      if (cached !== null && options?.force !== true) {
        setData(cached);
        // A cache hit is a success: clear any error left by a previous failed
        // request for this key so the dashboard does not keep showing it.
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const route = queryString
          ? `/api/dashboards/${endpoint}?${queryString}`
          : `/api/dashboards/${endpoint}`;
        const response = await fetch(route, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(await extractDashboardErrorMessage(response));
        }

        const payload: T = await response.json();

        if (!signal?.aborted) {
          writeCache(cacheKey, payload);
          setData(payload);
        }
      } catch (caughtError) {
        if (!signal?.aborted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown error",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [cacheKey, endpoint, queryString],
  );

  useEffect(() => {
    const controller = new AbortController();

    // Fetching data on mount is expected to update state asynchronously;
    // the state updates happen after the awaited fetch, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchData]);

  // An explicit retry must bypass the cache: otherwise a failed or empty first
  // result would be served again instead of re-querying.
  const refetch = useCallback(async () => {
    await fetchData(undefined, { force: true });
  }, [fetchData]);

  return { data, error, loading, refetch };
}
