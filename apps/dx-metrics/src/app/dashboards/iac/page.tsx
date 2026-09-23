"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import { METRIC_TARGETS } from "@/lib/config";
import { formatNumber } from "@/lib/format";
import type { Insight } from "@/lib/insights/types";
import { useDateFormatters } from "@/lib/locale";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { iacTooltips as tooltipContent } from "./tooltips";

interface IacDashboardData {
  leadTimeMovingAvg: { avgLeadTimeDays: number; week: string }[];
  leadTimeTrend: { date: string; trendLine: number }[];
  prsByReviewer: {
    avgLeadTimeDays: null | number;
    mergedPrs: number;
    reviewer: string;
    totalPrs: number;
  }[];
  prsOverTime: { prCount: number; week: string }[];
  supervisedVsUnsupervised: {
    cumulativeCount: number;
    prType: string;
    runDate: string;
  }[];
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function IacDashboard() {
  const colors = useSeriesColors();
  const { days, repository, setDays, setRepository } = useDashboardFilters();
  const { short: formatShortDate } = useDateFormatters();

  const { data, error, loading, refetch } = useDashboardData<IacDashboardData>(
    "iac",
    {
      days,
      repository,
    },
  );

  const supervisedPivoted = data
    ? pivotCumulativeSeries(data.supervisedVsUnsupervised, "prType", {
        "Supervised PRs": "supervised",
        "Unsupervised PRs": "unsupervised",
      })
    : [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">
          IaC Pull Requests Metrics
        </h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="IaC Pull Requests Metrics"
        />
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
        onRetry={refetch}
      />

      {data && (
        <>
          <DataFreshness
            className="mb-2"
            referenceDate={data.meta.referenceDate}
            windowDays={days}
          />
          <InsightsPanel
            className="mb-4"
            insights={data.insights}
            periodDays={days}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: colors.blue,
                  key: "avgLeadTimeDays",
                  name: "Lead Time",
                },
              ]}
              data={data.leadTimeMovingAvg}
              referenceLines={[
                { label: "target", value: METRIC_TARGETS.leadTimeDays },
              ]}
              title="IaC PR Lead Time (weekly average)"
              tooltip={tooltipContent.leadTimeMovingAvg}
              unit="days"
              xKey="week"
              xValueFormatter={(v: unknown) => formatShortDate(String(v))}
            />
            <SimpleLineChart
              data={data.leadTimeTrend}
              lines={[{ color: colors.red, key: "trendLine", name: "Trend" }]}
              title="IaC PR Lead Time (trend)"
              tooltip={tooltipContent.leadTimeTrend}
              unit="days"
              xKey="date"
              zeroBaseline={false}
            />
            <SimpleLineChart
              data={supervisedPivoted}
              lines={[
                {
                  color: colors.red,
                  key: "supervised",
                  name: "Supervised PRs",
                },
                {
                  color: colors.green,
                  key: "unsupervised",
                  name: "Unsupervised PRs",
                },
              ]}
              title="Supervised vs Unsupervised IaC PRs (Cumulative)"
              tooltip={tooltipContent.supervisedVsUnsupervised}
              unit="PRs"
              xKey="runDate"
            />
            <SimpleLineChart
              data={data.prsOverTime}
              lines={[{ color: colors.blue, key: "prCount", name: "PR Count" }]}
              title="IaC PRs Count Over Time"
              tooltip={tooltipContent.prsOverTime}
              unit="PRs"
              xKey="week"
            />
          </div>

          <div className="mt-4">
            <DataTable
              columns={[
                { key: "reviewer", label: "Reviewer" },
                { key: "totalPrs", label: "Total PRs" },
                { key: "mergedPrs", label: "Merged PRs" },
                {
                  key: "avgLeadTimeDays",
                  label: "Avg Lead Time (days)",
                  renderCell: (value) =>
                    typeof value === "number" ? formatNumber(value, 2) : "—",
                },
              ]}
              data={data.prsByReviewer}
              title="IaC PRs by Reviewer"
              tooltip={tooltipContent.prsByReviewer}
            />
          </div>
        </>
      )}
    </div>
  );
}
