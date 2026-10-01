"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import TooltipIcon from "@/components/TooltipIcon";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { overviewTooltips as tooltipContent } from "./tooltips";

interface ExecutiveSummaryData {
  insights: Insight[];
  meta: {
    /** Total dashboards feeding the summary, so the failure count is not hard-coded. */
    dashboardCount?: number;
    /** Dashboards whose insights could not be computed; the summary is partial. */
    failed: string[];
    referenceDate: null | string;
  };
}

export default function OverviewDashboard() {
  const { days, repositories, setDays, setRepositories } =
    useDashboardFilters();

  // A single aggregated endpoint replaces the previous nine per-dashboard
  // fetches: the server runs every adapter in parallel and returns only the
  // insights, so the browser makes one request instead of nine.
  const { data, error, loading, refetch } =
    useDashboardData<ExecutiveSummaryData>("insights", {
      days,
      repositories,
    });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">Executive Summary</h2>
        <TooltipIcon content={tooltipContent.title} label="Executive Summary" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Most urgent insights across every dashboard for the selected
        repositories. For the cross-repository comparison see the Benchmark
        page.
      </p>

      <DashboardFilters
        onRepositoriesChange={setRepositories}
        onTimeIntervalChange={setDays}
        repositories={repositories}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data?.meta.referenceDate && (
        // The summary aggregates dashboards with independent reference dates and
        // some all-time insights, so it deliberately shows only the latest date
        // rather than one shared window range.
        <DataFreshness referenceDate={data.meta.referenceDate} />
      )}

      {data && data.meta.failed.length > 0 && (
        <div
          className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          {data.meta.failed.length} of {data.meta.dashboardCount ?? 10}{" "}
          dashboards failed to load ({data.meta.failed.join(", ")}). The summary
          below is incomplete.
        </div>
      )}

      <InsightsPanel
        className="mt-4"
        defaultOpen
        insights={data?.insights ?? []}
        limit={9}
        periodDays={days}
      />
    </div>
  );
}
