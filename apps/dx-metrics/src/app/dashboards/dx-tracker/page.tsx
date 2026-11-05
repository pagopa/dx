"use client";

import { SimpleBarChart, SimpleLineChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";

import { trackerTooltips as tooltipContent } from "./tooltips";

interface TrackerData {
  byCategory: { category: string; requests: number }[];
  byPriority: { priority: string; requests: number }[];
  cards: {
    avgClose: null | number;
    closedTotal: null | number;
    openedTotal: null | number;
    requestsTrend: null | number;
  };
  frequencyTrend: {
    actualRequests: number;
    requestDate: string;
    trend: number;
  }[];
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function TrackerDashboard() {
  const colors = useSeriesColors();
  const { data, error, loading, refetch } = useDashboardData<TrackerData>(
    "tracker",
    {},
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">
          Team DX Requests Metrics
        </h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Team DX Requests Metrics"
        />
      </div>

      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <DataFreshness
            className="mb-2"
            referenceDate={data.meta.referenceDate}
          />
          <InsightsPanel className="mb-6" insights={data.insights} />
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Opened Requests (total)"
              tooltip={tooltipContent.openedRequestsTotal}
              value={data.cards.openedTotal}
            />
            <MetricCard
              label="Closed Requests (total)"
              tooltip={tooltipContent.closedRequestsTotal}
              value={data.cards.closedTotal}
            />
            <MetricCard
              label="Avg Time to Close"
              suffix="days"
              tooltip={tooltipContent.avgTimeToClose}
              value={data.cards.avgClose}
            />
            <MetricCard
              label="Requests Trend"
              suffix="%"
              tooltip={tooltipContent.requestsTrend}
              value={data.cards.requestsTrend}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <SimpleLineChart
              data={data.frequencyTrend}
              lines={[
                {
                  color: colors.blue,
                  key: "actualRequests",
                  name: "Actual Requests",
                },
                { color: colors.red, key: "trend", name: "Trend" },
              ]}
              title="DX Requests Frequency Trend"
              tooltip={tooltipContent.frequencyTrend}
              unit="requests"
              xKey="requestDate"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: colors.lightBlue,
                  key: "requests",
                  name: "Requests",
                },
              ]}
              data={data.byCategory}
              title="Requests by Category"
              tooltipFormatter={(value) => value.toFixed(0)}
              unit="requests"
              xKey="category"
            />
            <SimpleBarChart
              bars={[
                {
                  color: colors.purple,
                  key: "requests",
                  name: "Requests",
                },
              ]}
              data={data.byPriority}
              title="Requests by Priority"
              tooltipFormatter={(value) => value.toFixed(0)}
              unit="requests"
              xKey="priority"
            />
          </div>
        </>
      )}
    </div>
  );
}
