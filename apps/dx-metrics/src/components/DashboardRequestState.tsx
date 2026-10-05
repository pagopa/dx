"use client";

/** Renders consistent loading and error feedback for dashboard requests. */
interface DashboardRequestStateProps {
  error: null | string;
  loading: boolean;
  onRetry: () => Promise<void>;
}

const SKELETON_CARDS = 4;
const SKELETON_CHARTS = 2;

/**
 * Placeholder layout shown while a dashboard loads. It mirrors the metric-card
 * grid and the chart grid so the real content lands in place instead of
 * pushing everything down after a spinner.
 */
function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
            key={index}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: SKELETON_CHARTS }, (_, index) => (
          <div
            className="h-80 animate-pulse rounded-xl border border-border bg-card"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardRequestState({
  error,
  loading,
  onRetry,
}: DashboardRequestStateProps) {
  const isIdle = !loading && !error;

  return (
    // The status region is always rendered, so a retry updates existing text
    // instead of inserting a region that assistive tech may never announce.
    <div className={isIdle ? "" : "mb-6 space-y-3"}>
      <div role="status">
        {loading ? (
          <>
            <span className="sr-only">Loading dashboard data…</span>
            <DashboardSkeleton />
          </>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="mt-1 text-red-700/90 dark:text-red-200/90">
                {error}
              </p>
            </div>
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:border-red-300/30 dark:text-red-100 dark:focus-visible:ring-red-300"
              onClick={() => {
                void onRetry();
              }}
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
