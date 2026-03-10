"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import {
  SimpleLineChart,
  SimpleBarChart,
  DataTable,
} from "@/components/Charts";
import TooltipIcon from "@/components/TooltipIcon";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import { iacTooltips as tooltipContent } from "./tooltips";

interface IacDashboardData {
  leadTimeMovingAvg: { week: string; avg_lead_time_days: number }[];
  leadTimeTrend: { date: string; trend_line: number }[];
  supervisedVsUnsupervised: {
    run_date: string;
    pr_type: string;
    cumulative_count: number;
  }[];
  prsOverTime: { week: string; pr_count: number }[];
  prsByReviewer: {
    reviewer: string;
    total_prs: number;
    merged_prs: number;
    avg_lead_time_days: number;
  }[];
}

export default function IacDashboard() {
  const { repository, days, setRepository, setDays } = useDashboardFilters();

  const { data, loading, error, refetch } = useDashboardData<IacDashboardData>(
    "iac",
    {
      repository,
      days,
    },
  );

  const supervisedPivoted = data
    ? pivotCumulativeSeries(data.supervisedVsUnsupervised, "pr_type", {
        "Supervised PRs": "supervised",
        "Unsupervised PRs": "unsupervised",
      })
    : [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          IaC Pull Requests Metrics
        </h2>
        <TooltipIcon content={tooltipContent.title} />
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
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SimpleBarChart
              title="IaC PR Lead Time (weekly average)"
              tooltip={tooltipContent.leadTimeMovingAvg}
              data={data.leadTimeMovingAvg}
              xKey="week"
              bars={[
                {
                  key: "avg_lead_time_days",
                  name: "Lead Time",
                  color: "#2563eb",
                },
              ]}
              xValueFormatter={(v: string) => {
                // Shorten "2025-11-10" to "Nov 10"
                const d = new Date(v);
                return isNaN(d.getTime())
                  ? v
                  : d.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    });
              }}
            />
            <SimpleLineChart
              title="IaC PR Lead Time (trend)"
              tooltip={tooltipContent.leadTimeTrend}
              data={data.leadTimeTrend}
              xKey="date"
              lines={[{ key: "trend_line", name: "Trend", color: "#dc2626" }]}
            />
            <SimpleLineChart
              title="Supervised vs Unsupervised IaC PRs (Cumulative)"
              tooltip={tooltipContent.supervisedVsUnsupervised}
              data={supervisedPivoted}
              xKey="run_date"
              lines={[
                {
                  key: "supervised",
                  name: "Supervised PRs",
                  color: "#dc2626",
                },
                {
                  key: "unsupervised",
                  name: "Unsupervised PRs",
                  color: "#16a34a",
                },
              ]}
            />
            <SimpleLineChart
              title="IaC PRs Count Over Time"
              tooltip={tooltipContent.prsOverTime}
              data={data.prsOverTime}
              xKey="week"
              lines={[{ key: "pr_count", name: "PR Count", color: "#2563eb" }]}
            />
          </div>

          <div className="mt-4">
            <DataTable
              title="IaC PRs by Reviewer"
              tooltip={tooltipContent.prsByReviewer}
              columns={[
                { key: "reviewer", label: "Reviewer" },
                { key: "total_prs", label: "Total PRs" },
                { key: "merged_prs", label: "Merged PRs" },
                { key: "avg_lead_time_days", label: "Avg Lead Time (days)" },
              ]}
              data={data.prsByReviewer}
            />
          </div>
        </>
      )}
    </div>
  );
}
