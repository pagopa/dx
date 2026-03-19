"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const buildDashboardQueryString = (params: Record<string, number | string>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .forEach(([key, value]) => {
      searchParams.set(key, String(value));
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
  params: Record<string, number | string>,
) {
  const [data, setData] = useState<null | T>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  // Serialize params to a stable string key to avoid unnecessary re-renders when
  // callers pass inline objects. This ensures the effect only refetches when the
  // actual param values change, not when the object identity changes.
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

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
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
    [endpoint, queryString],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch };
}
