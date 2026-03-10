"use client";

import { DashboardRequestState } from "@/components/dashboard-request-state";
import { MetricCard } from "@/components/MetricCard";
import { SimpleLineChart, SimpleBarChart } from "@/components/Charts";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { trackerTooltips as tooltipContent } from "./tooltips";

interface TrackerData {
  cards: {
    openedTotal: number | null;
    closedTotal: number | null;
    avgClose: number | null;
    requestsTrend: number | null;
  };
  frequencyTrend: {
    request_date: string;
    actual_requests: number;
    trend: number;
  }[];
  byCategory: { category: string; requests: number }[];
  byPriority: { priority: string; requests: number }[];
}

export default function TrackerDashboard() {
  const { data, loading, error, refetch } = useDashboardData<TrackerData>(
    "tracker",
    {},
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          Team DX Requests Metrics
        </h2>
        <TooltipIcon content={tooltipContent.title} />
      </div>

      <DashboardRequestState
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="mb-6 grid grid-cols-4 gap-4">
            <MetricCard
              label="Opened Requests (total)"
              value={data.cards.openedTotal}
              tooltip={tooltipContent.openedRequestsTotal}
            />
            <MetricCard
              label="Closed Requests (total)"
              value={data.cards.closedTotal}
              tooltip={tooltipContent.closedRequestsTotal}
            />
            <MetricCard
              label="Avg Time to Close"
              value={data.cards.avgClose}
              suffix="days"
              tooltip={tooltipContent.avgTimeToClose}
            />
            <MetricCard
              label="Requests Trend"
              value={data.cards.requestsTrend}
              suffix="%"
              tooltip={tooltipContent.requestsTrend}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <SimpleLineChart
              title="DX Requests Frequency Trend"
              data={data.frequencyTrend}
              xKey="request_date"
              tooltip={tooltipContent.frequencyTrend}
              lines={[
                {
                  key: "actual_requests",
                  name: "Actual Requests",
                  color: "#2563eb",
                },
                { key: "trend", name: "Trend", color: "#dc2626" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
