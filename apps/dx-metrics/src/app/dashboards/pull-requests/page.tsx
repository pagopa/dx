"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { DashboardFilters } from "@/components/DashboardFilters";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { pullRequestsTooltips as tooltipContent } from "./tooltips";

interface PrDashboardData {
  cards: {
    avgLeadTime: null | number;
    commentsPerPr: null | number;
    totalComments: null | number;
    totalPrs: null | number;
  };
  cumulatedNewPrs: { cumulative_count: number; date: string }[];
  leadTimeMovingAvg: { avg_lead_time_days: number; week: string }[];
  leadTimeTrend: { date: string; trend_line: number }[];
  mergedPrs: { date: string; pr_count: number }[];
  newPrs: { date: string; pr_count: number }[];
  prComments: { avg_comments: number; week: string }[];
  prSize: { avg_additions: number; week: string }[];
  prSizeDistribution: {
    avg_additions: number;
    pr_count: number;
    size_range: string;
  }[];
  slowestPrs: {
    created_at: string;
    lead_time_days: number;
    merged_at: string;
    number: number;
    title: string;
  }[];
  unmergedPrs: { date: string; open_prs: number }[];
}

export default function PullRequestsDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters();

  const { data, error, loading, refetch } = useDashboardData<PrDashboardData>(
    "pull-requests",
    {
      days,
      repository,
    },
  );

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
        onRepositoryChange={setRepository}
        onTimeIntervalChange={setDays}
        repository={repository}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        loadingMessage="Synchronizing data..."
        onRetry={refetch}
      />

      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Avg Lead Time"
              suffix="days"
              tooltip={tooltipContent.avgLeadTime}
              value={data.cards.avgLeadTime}
            />
            <MetricCard
              label="Total PRs"
              tooltip={tooltipContent.totalPrs}
              value={data.cards.totalPrs}
            />
            <MetricCard
              label="Total Comments"
              tooltip={tooltipContent.totalComments}
              value={data.cards.totalComments}
            />
            <MetricCard
              label="Comments / PR"
              tooltip={tooltipContent.commentsPerPr}
              value={data.cards.commentsPerPr}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SimpleBarChart
              bars={[
                {
                  color: "#238636",
                  key: "avg_lead_time_days",
                  name: "Days",
                },
              ]}
              data={data.leadTimeMovingAvg}
              title="Avg Lead Time (Weekly)"
              tooltip={tooltipContent.leadTimeMovingAvg}
              xKey="week"
            />
            <SimpleLineChart
              data={data.leadTimeTrend}
              lines={[{ color: "#dc2626", key: "trend_line", name: "Trend" }]}
              title="Lead Time Trend"
              tooltip={tooltipContent.leadTimeTrend}
              xKey="date"
            />
            <SimpleBarChart
              bars={[{ color: "#2563eb", key: "pr_count", name: "Merged PRs" }]}
              data={data.mergedPrs}
              title="Merged Pull Requests"
              tooltip={tooltipContent.mergedPrs}
              xKey="date"
            />
            <SimpleLineChart
              data={data.unmergedPrs}
              lines={[{ color: "#ea580c", key: "open_prs", name: "Open PRs" }]}
              title="Unmerged Pull Requests"
              tooltip={tooltipContent.unmergedPrs}
              xKey="date"
            />
            <SimpleBarChart
              bars={[{ color: "#16a34a", key: "pr_count", name: "New PRs" }]}
              data={data.newPrs}
              title="New Pull Requests"
              tooltip={tooltipContent.newPrs}
              xKey="date"
            />
            <SimpleLineChart
              data={data.cumulatedNewPrs}
              lines={[
                {
                  color: "#7c3aed",
                  key: "cumulative_count",
                  name: "Cumulated New PRs",
                },
              ]}
              title="Cumulated New Pull Requests"
              tooltip={tooltipContent.cumulatedNewPrs}
              xKey="date"
            />
            <SimpleBarChart
              bars={[
                {
                  color: "#2196F3",
                  key: "avg_additions",
                  name: "Avg Additions",
                },
              ]}
              data={data.prSize}
              title="Pull Requests Size (weekly average)"
              tooltip={tooltipContent.prSize}
              xKey="week"
            />
            <SimpleBarChart
              bars={[
                {
                  color: "#0891b2",
                  key: "avg_comments",
                  name: "Avg Comments",
                },
              ]}
              data={data.prComments}
              title="Pull Requests Comments (weekly average)"
              tooltip={tooltipContent.prComments}
              xKey="week"
            />
            <SimpleBarChart
              bars={[
                {
                  color: "#2196F3",
                  key: "avg_additions",
                  name: "Avg Additions",
                },
              ]}
              data={data.prSizeDistribution}
              title="Pull Requests Size (avg additions)"
              tooltip={tooltipContent.prSizeDistribution}
              xKey="size_range"
            />
          </div>

          <div className="mt-8">
            <DataTable
              columns={[
                { key: "title", label: "Title" },
                { key: "lead_time_days", label: "Lead Time (days)" },
                { key: "number", label: "#" },
                { key: "created_at", label: "Created" },
                { key: "merged_at", label: "Merged" },
              ]}
              data={data.slowestPrs}
              title="Slowest Pull Requests"
              tooltip={tooltipContent.slowestPrs}
            />
          </div>
        </div>
      )}
    </div>
  );
}
