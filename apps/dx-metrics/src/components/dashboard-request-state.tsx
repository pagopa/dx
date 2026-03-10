"use client";

/** Renders consistent loading and error feedback for dashboard requests. */
interface DashboardRequestStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
  loadingMessage?: string;
}

export function DashboardRequestState({
  loading,
  error,
  onRetry,
  loadingMessage = "Loading dashboard data...",
}: DashboardRequestStateProps) {
  if (!loading && !error) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          <p className="text-sm font-medium">{loadingMessage}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Unable to load dashboard data</p>
              <p className="mt-1 text-red-200/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void onRetry();
              }}
              className="inline-flex items-center justify-center rounded-md border border-red-300/30 px-3 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
