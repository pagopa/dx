"use client";

import {
  DataTable,
  SERIES_COLORS,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import {
  INSIGHT_THRESHOLDS,
  METRIC_TARGETS,
  WEEKLY_BUCKET_THRESHOLD_DAYS,
} from "@/lib/config";
import { formatNumber } from "@/lib/format";
import { severityFromTargetWithTrend } from "@/lib/insights/insight-helpers";
import type { Insight } from "@/lib/insights/types";
import { percentChange } from "@/lib/stats";
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
  cumulatedNewPrs: { cumulativeCount: number; date: string }[];
  leadTimeMovingAvg: { avgLeadTimeDays: number; week: string }[];
  leadTimePercentiles: {
    count: number;
    p50: null | number;
    p85: null | number;
    p95: null | number;
  };
  leadTimeTrend: { date: string; trendLine: number }[];
  mergedPrs: { date: string; prCount: number }[];
  newPrs: { date: string; prCount: number }[];
  prComments: { avgComments: number; week: string }[];
  prSize: { avgAdditions: number; week: string }[];
  prSizeDistribution: {
    avgAdditions: number;
    prCount: number;
    sizeRange: string;
  }[];
  slowestPrs: {
    createdAt: string;
    leadTimeDays: number;
    mergedAt: string;
    number: number;
    title: string;
  }[];
  unmergedPrs: { date: string; openPrs: number }[];
  previousLeadTime: null | number;
  insights: Insight[];
  meta: { referenceDate: string };
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

  // The SQL bucket switches from day to week above the shared threshold; the
  // caption repeats it on the chart so a point is never read as the wrong unit.
  const bucketCaption =
    days < WEEKLY_BUCKET_THRESHOLD_DAYS ? "per day" : "per week";

  // One comparison everywhere: the current period versus the immediately
  // preceding, equally-sized window — the same value shown as `previous` — so
  // the card, the insight, and the "previous" figure cannot disagree.
  const leadTimeDelta =
    data?.cards.avgLeadTime != null && data.previousLeadTime != null
      ? percentChange(data.cards.avgLeadTime, data.previousLeadTime)
      : null;
  const leadTimeSeverity =
    data?.cards.avgLeadTime != null
      ? severityFromTargetWithTrend(
          data.cards.avgLeadTime,
          METRIC_TARGETS.leadTimeDays,
          leadTimeDelta,
          {
            higherIsBetter: false,
            significantChangePct: METRIC_TARGETS.significantChangePct,
            tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
          },
        )
      : undefined;
  const leadTimeSparkline = data?.leadTimeMovingAvg.map(
    (row) => row.avgLeadTimeDays,
  );
  // Percentiles sit next to the mean on the card: the headline is an average,
  // and a right-skewed distribution needs the median and the tail in view.
  const leadTimeBreakdown = data?.leadTimePercentiles
    ? [
        {
          label: "median",
          value: `${formatNumber(data.leadTimePercentiles.p50, 1)} d`,
        },
        {
          label: "p95",
          value: `${formatNumber(data.leadTimePercentiles.p95, 1)} d`,
        },
      ]
    : undefined;
  // Lower is better here, so the acceptable region is everything from zero up
  // to the target plus its tolerance; the band mirrors the severity rule.
  const leadTimeToleranceBand = {
    from: 0,
    to:
      METRIC_TARGETS.leadTimeDays *
      (1 + INSIGHT_THRESHOLDS.targetTolerancePct / 100),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
              Pull Request <span className="text-green-500">Insights</span>
            </h2>
            <TooltipIcon
              content={tooltipContent.title}
              label="Pull Request Insights"
            />
          </div>
          <p className="text-sm text-gray-400 mt-1">
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
        onRetry={refetch}
      />

      {data && (
        <div className="space-y-8">
          <DataFreshness referenceDate={data.meta.referenceDate} />
          <InsightsPanel insights={data.insights} periodDays={days} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              breakdown={leadTimeBreakdown}
              label="Mean Lead Time"
              suffix="days"
              tooltip={tooltipContent.avgLeadTime}
              value={data.cards.avgLeadTime}
              deltaPct={leadTimeDelta}
              deltaLabel="vs prev"
              previousValue={data.previousLeadTime}
              sampleSize={data.leadTimePercentiles.count}
              target={METRIC_TARGETS.leadTimeDays}
              severity={leadTimeSeverity}
              sparkline={leadTimeSparkline}
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

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Flow
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.green,
                    key: "avgLeadTimeDays",
                    name: "Days",
                  },
                ]}
                caption="per week"
                data={data.leadTimeMovingAvg}
                referenceLines={[
                  { label: "target", value: METRIC_TARGETS.leadTimeDays },
                ]}
                targetBand={leadTimeToleranceBand}
                title="Mean Lead Time (Weekly)"
                tooltip={tooltipContent.leadTimeMovingAvg}
                unit="days"
                xKey="week"
              />
              <SimpleLineChart
                caption="per week"
                data={data.leadTimeTrend}
                lines={[
                  { color: SERIES_COLORS.red, key: "trendLine", name: "Trend" },
                ]}
                title="Lead Time Trend (within period)"
                tooltip={tooltipContent.leadTimeTrend}
                unit="days"
                xKey="date"
                zeroBaseline={false}
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.blue,
                    key: "prCount",
                    name: "Merged PRs",
                  },
                ]}
                caption={bucketCaption}
                data={data.mergedPrs}
                title="Merged Pull Requests"
                tooltip={tooltipContent.mergedPrs}
                tooltipFormatter={(value) => value.toFixed(0)}
                unit="PRs"
                xKey="date"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.green,
                    key: "prCount",
                    name: "New PRs",
                  },
                ]}
                caption={bucketCaption}
                data={data.newPrs}
                title="New Pull Requests"
                tooltip={tooltipContent.newPrs}
                tooltipFormatter={(value) => value.toFixed(0)}
                unit="PRs"
                xKey="date"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Backlog
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleLineChart
                caption="per day"
                data={data.unmergedPrs}
                lines={[
                  {
                    color: SERIES_COLORS.amber,
                    key: "openPrs",
                    name: "Open PRs",
                  },
                ]}
                title="Open Pull Requests (never merged)"
                tooltip={tooltipContent.unmergedPrs}
                unit="PRs"
                xKey="date"
              />
              <SimpleLineChart
                caption="per day"
                data={data.cumulatedNewPrs}
                lines={[
                  {
                    color: SERIES_COLORS.purple,
                    key: "cumulativeCount",
                    name: "Cumulated New PRs",
                  },
                ]}
                title="Cumulated New Pull Requests"
                tooltip={tooltipContent.cumulatedNewPrs}
                unit="PRs"
                xKey="date"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Size &amp; collaboration
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgAdditions",
                    name: "Avg Additions",
                  },
                ]}
                caption="per week"
                data={data.prSize}
                title="Pull Requests Size (weekly average)"
                tooltip={tooltipContent.prSize}
                unit="lines"
                xKey="week"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgComments",
                    name: "Avg Comments",
                  },
                ]}
                caption="per week"
                data={data.prComments}
                title="Pull Requests Comments (weekly average)"
                tooltip={tooltipContent.prComments}
                unit="comments"
                xKey="week"
              />
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.lightBlue,
                    key: "avgAdditions",
                    name: "Avg Additions",
                  },
                ]}
                data={data.prSizeDistribution}
                title="Pull Requests Size (avg additions)"
                tooltip={tooltipContent.prSizeDistribution}
                unit="lines"
                xKey="sizeRange"
              />
            </div>
          </section>

          <div className="mt-8">
            <DataTable
              columns={[
                { key: "title", label: "Title" },
                { key: "leadTimeDays", label: "Lead Time (days)" },
                { key: "number", label: "#" },
                { key: "createdAt", label: "Created" },
                { key: "mergedAt", label: "Merged" },
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
