"use client";

/** Renders consistent loading and error feedback for dashboard requests. */
interface DashboardRequestStateProps {
  error: null | string;
  loading: boolean;
  onRetry: () => Promise<void>;
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
          <span className="flex items-center gap-2 text-gray-400">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
            />
            <span className="text-sm font-medium">Loading dashboard data…</span>
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="mt-1 text-red-200/90">{error}</p>
            </div>
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-md border border-red-300/30 px-3 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
