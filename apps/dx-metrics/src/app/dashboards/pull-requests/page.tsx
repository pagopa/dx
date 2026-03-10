"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { MetricCard } from "@/components/MetricCard";
import {
  SimpleLineChart,
  SimpleBarChart,
  DataTable,
} from "@/components/Charts";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import { pullRequestsTooltips as tooltipContent } from "./tooltips";

interface PrDashboardData {
  cards: {
    avgLeadTime: number | null;
    totalPrs: number | null;
    totalComments: number | null;
    commentsPerPr: number | null;
  };
  leadTimeMovingAvg: { week: string; avg_lead_time_days: number }[];
  leadTimeTrend: { date: string; trend_line: number }[];
  mergedPrs: { date: string; pr_count: number }[];
  unmergedPrs: { date: string; open_prs: number }[];
  newPrs: { date: string; pr_count: number }[];
  cumulatedNewPrs: { date: string; cumulative_count: number }[];
  prSize: { week: string; avg_additions: number }[];
  prComments: { week: string; avg_comments: number }[];
  prSizeDistribution: {
    size_range: string;
    pr_count: number;
    avg_additions: number;
  }[];
  slowestPrs: {
    title: string;
    lead_time_days: number;
    number: number;
    created_at: string;
    merged_at: string;
  }[];
}

export default function PullRequestsDashboard() {
  const { repository, days, setRepository, setDays } = useDashboardFilters();

  const { data, loading, error, refetch } =
    useDashboardData<PrDashboardData>("pull-requests", {
      repository,
      days,
    });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
              Pull Request <span className="text-green-500">Insights</span>
            </h2>
            <TooltipIcon content={tooltipContent.title} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing engineering velocity and collaboration patterns.
          </p>
        </div>
      </div>

      <DashboardFilters
        repository={repository}
        timeInterval={days}
        onRepositoryChange={setRepository}
        onTimeIntervalChange={setDays}
      />
      <DashboardRequestState
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingMessage="Synchronizing data..."
      />

      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Avg Lead Time"
              value={data.cards.avgLeadTime}
              suffix="days"
              tooltip={tooltipContent.avgLeadTime}
            />
            <MetricCard
              label="Total PRs"
              value={data.cards.totalPrs}
              tooltip={tooltipContent.totalPrs}
            />
            <MetricCard
              label="Total Comments"
              value={data.cards.totalComments}
              tooltip={tooltipContent.totalComments}
            />
            <MetricCard
              label="Comments / PR"
              value={data.cards.commentsPerPr}
              tooltip={tooltipContent.commentsPerPr}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SimpleBarChart
              title="Avg Lead Time (Weekly)"
              data={data.leadTimeMovingAvg}
              xKey="week"
              bars={[
                {
                  key: "avg_lead_time_days",
                  name: "Days",
                  color: "#238636",
                },
              ]}
              tooltip={tooltipContent.leadTimeMovingAvg}
            />
            <SimpleLineChart
              title="Lead Time Trend"
              data={data.leadTimeTrend}
              xKey="date"
              lines={[{ key: "trend_line", name: "Trend", color: "#dc2626" }]}
              tooltip={tooltipContent.leadTimeTrend}
            />
            <SimpleBarChart
              title="Merged Pull Requests"
              data={data.mergedPrs}
              xKey="date"
              bars={[{ key: "pr_count", name: "Merged PRs", color: "#2563eb" }]}
              tooltip={tooltipContent.mergedPrs}
            />
            <SimpleLineChart
              title="Unmerged Pull Requests"
              data={data.unmergedPrs}
              xKey="date"
              lines={[{ key: "open_prs", name: "Open PRs", color: "#ea580c" }]}
              tooltip={tooltipContent.unmergedPrs}
            />
            <SimpleBarChart
              title="New Pull Requests"
              data={data.newPrs}
              xKey="date"
              bars={[{ key: "pr_count", name: "New PRs", color: "#16a34a" }]}
              tooltip={tooltipContent.newPrs}
            />
            <SimpleLineChart
              title="Cumulated New Pull Requests"
              data={data.cumulatedNewPrs}
              xKey="date"
              lines={[
                {
                  key: "cumulative_count",
                  name: "Cumulated New PRs",
                  color: "#7c3aed",
                },
              ]}
              tooltip={tooltipContent.cumulatedNewPrs}
            />
            <SimpleBarChart
              title="Pull Requests Size (weekly average)"
              data={data.prSize}
              xKey="week"
              bars={[
                {
                  key: "avg_additions",
                  name: "Avg Additions",
                  color: "#2196F3",
                },
              ]}
              tooltip={tooltipContent.prSize}
            />
            <SimpleBarChart
              title="Pull Requests Comments (weekly average)"
              data={data.prComments}
              xKey="week"
              bars={[
                {
                  key: "avg_comments",
                  name: "Avg Comments",
                  color: "#0891b2",
                },
              ]}
              tooltip={tooltipContent.prComments}
            />
            <SimpleBarChart
              title="Pull Requests Size (avg additions)"
              data={data.prSizeDistribution}
              xKey="size_range"
              bars={[
                {
                  key: "avg_additions",
                  name: "Avg Additions",
                  color: "#2196F3",
                },
              ]}
              tooltip={tooltipContent.prSizeDistribution}
            />
          </div>

          <div className="mt-8">
            <DataTable
              title="Slowest Pull Requests"
              columns={[
                { key: "title", label: "Title" },
                { key: "lead_time_days", label: "Lead Time (days)" },
                { key: "number", label: "#" },
                { key: "created_at", label: "Created" },
                { key: "merged_at", label: "Merged" },
              ]}
              data={data.slowestPrs}
              tooltip={tooltipContent.slowestPrs}
            />
          </div>
        </div>
      )}
    </div>
  );
}
