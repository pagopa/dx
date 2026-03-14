"use client";

import { SimpleLineChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
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
    actual_requests: number;
    request_date: string;
    trend: number;
  }[];
}

export default function TrackerDashboard() {
  const { data, error, loading, refetch } = useDashboardData<TrackerData>(
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
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="mb-6 grid grid-cols-4 gap-4">
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
                  color: "#2563eb",
                  key: "actual_requests",
                  name: "Actual Requests",
                },
                { color: "#dc2626", key: "trend", name: "Trend" },
              ]}
              title="DX Requests Frequency Trend"
              tooltip={tooltipContent.frequencyTrend}
              xKey="request_date"
            />
          </div>
        </>
      )}
    </div>
  );
}
