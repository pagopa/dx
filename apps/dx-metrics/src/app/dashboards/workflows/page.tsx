"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleLineChart,
  SimplePieChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import { WEEKLY_BUCKET_THRESHOLD_DAYS } from "@/lib/config";
import type { DashboardMetaView } from "@/lib/dashboard-meta";
import { formatInteger, formatNumber } from "@/lib/format";
import type { Insight } from "@/lib/insights/types";
import { useDateFormatters } from "@/lib/locale";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
import { percentChange } from "@/lib/stats";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { workflowsTooltips as tooltipContent } from "./tooltips";

interface WorkflowDashboardData {
  avgDuration: { averageDurationMinutes: number; workflowName: string }[];
  cumulativeDuration: {
    cumulativeDurationMinutes: number;
    workflowName: string;
  }[];
  deployments: { runWeek: string; weeklyDeploymentCount: number }[];
  durationPercentiles: {
    count: number;
    p50: null | number;
    p85: null | number;
    p95: null | number;
  };
  dxVsNonDx: {
    cumulativeCount: number;
    pipelineType: string;
    runDate: string;
  }[];
  failures: { failedRuns: number; workflowName: string }[];
  runCount: { runCount: number; workflowName: string }[];
  successRatio: {
    failedRuns: number;
    successfulRuns: number;
    successRatePercentage: number;
    totalRuns: number;
    workflowName: string;
  }[];
  summary: {
    avgDurationMinutes: number;
    failedDurationMinutes: null | number;
    firstPipelineDate: string;
    /** Same card metrics over the immediately preceding, equally-sized window. */
    previousAvgDurationMinutes: null | number;
    previousFailedDurationMinutes: null | number;
    previousTotalDurationMinutes: null | number;
    previousTotalPipelines: null | number;
    totalDurationMinutes: number;
    totalPipelines: number;
  };
  triggerTypes: { runCount: number; triggerType: string }[];
  /**
   * Optional so a cached payload from before this field existed still renders:
   * the chart falls back to an empty list instead of throwing.
   */
  triggerBreakdown?: {
    automatic: number;
    manual: number;
    unknown: number;
    workflowName: string;
  }[];
  /** Daily/weekly failure counts for the two most failing pipelines. */
  topFailureTrend: {
    bucket: string;
    failedRuns: number;
    workflowName: string;
  }[];
  /** Daily/weekly average duration for the two slowest pipelines. */
  topSlowestDurationTrend: {
    averageDurationMinutes: number;
    bucket: string;
    workflowName: string;
  }[];
  insights: Insight[];
  meta: DashboardMetaView;
}

interface WorkflowTrendRow {
  bucket: string;
  workflowName: string;
}

/**
 * Pivots long-format `(bucket, workflow)` rows into one row per bucket with a
 * column per workflow, which is the shape the line chart reads. Missing buckets
 * stay undefined so the chart shows a gap instead of inventing a zero.
 */
const pivotWorkflowTrend = <TRow extends WorkflowTrendRow>(
  rows: readonly TRow[],
  valueKey: keyof TRow,
): { data: Record<string, unknown>[]; workflowNames: string[] } => {
  const buckets = new Map<string, Record<string, unknown>>();
  const totals = new Map<string, number>();

  for (const row of rows) {
    const entry = buckets.get(row.bucket) ?? { bucket: row.bucket };
    entry[row.workflowName] = row[valueKey];
    buckets.set(row.bucket, entry);

    const value = Number(row[valueKey]);
    totals.set(
      row.workflowName,
      (totals.get(row.workflowName) ?? 0) +
        (Number.isFinite(value) ? value : 0),
    );
  }

  return {
    data: [...buckets.values()].sort((left, right) =>
      String(left.bucket).localeCompare(String(right.bucket)),
    ),
    // Highest total first so the ranking colour also goes to the leading
    // pipeline, matching the ranked bar chart above.
    workflowNames: [...totals.entries()]
      .sort(([, left], [, right]) => right - left)
      .map(([workflowName]) => workflowName),
  };
};

export default function WorkflowsDashboard() {
  const {
    days,
    end,
    repositories,
    setRange,
    setRepositories,
    start,
    timeParams,
  } = useDashboardFilters();

  const { data, error, loading, refetch } =
    useDashboardData<WorkflowDashboardData>("workflows", {
      ...timeParams,
      repositories,
    });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">Workflow Metrics</h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Workflow Metrics"
          side="right"
        />
      </div>
      <DashboardFilters
        availableFrom={data?.meta.availableFrom}
        availableTo={data?.meta.availableTo}
        onRangeChange={setRange}
        onRepositoriesChange={setRepositories}
        rangeEnd={end ?? data?.meta.windowEnd}
        rangeStart={start ?? data?.meta.windowStart}
        repositories={repositories}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />
      {data && <WorkflowsDashboardContent data={data} days={days} />}
    </div>
  );
}

function WorkflowsDashboardContent({
  data,
  days,
}: {
  data: WorkflowDashboardData;
  days: number;
}) {
  const colors = useSeriesColors();
  const { full: formatFullDate, short: formatShortDate } = useDateFormatters();
  const dxVsNonDxPivoted = pivotCumulativeSeries(
    data.dxVsNonDx,
    "pipelineType",
    {
      "DX Pipelines": "dx",
      "Non-DX Pipelines": "non_dx",
    },
  );

  // Chart axes accept `unknown`; route them through the shared locale-aware
  // formatters so a category value is never mistaken for a date.
  const shortDateTick = (value: unknown) => formatShortDate(String(value));

  // The headline duration is a run-weighted mean; the median and p95 keep a
  // skewed distribution visible next to it.
  const durationBreakdown = [
    {
      label: "median",
      value: `${formatNumber(data.durationPercentiles.p50, 1)} min`,
    },
    {
      label: "p95",
      value: `${formatNumber(data.durationPercentiles.p95, 1)} min`,
    },
  ];

  // "Unknown" (trigger not recorded on rows imported before the column existed)
  // would dwarf the split and make the percentages describe only the subset that
  // happens to be recorded, so it is excluded from both trigger charts. The
  // excluded share is surfaced in the caption instead. Both charts share it
  // because they cover the same population.
  const triggerCoverage = data.triggerTypes.reduce(
    (coverage, row) => ({
      total: coverage.total + row.runCount,
      unknown:
        coverage.unknown + (row.triggerType === "Unknown" ? row.runCount : 0),
    }),
    { total: 0, unknown: 0 },
  );
  const triggerExclusionCaption =
    triggerCoverage.total > 0 && triggerCoverage.unknown > 0
      ? `${formatInteger(triggerCoverage.unknown)} runs (${Math.round(
          (triggerCoverage.unknown / triggerCoverage.total) * 100,
        )}%) without a recorded trigger, excluded`
      : undefined;

  // The trigger query already returns display-ready categories (Manual,
  // Automatic, Unknown); the pie primitive wants `name`/`value`.
  const triggerDistribution = data.triggerTypes
    .filter((row) => row.triggerType !== "Unknown")
    .map((row) => ({ name: row.triggerType, value: row.runCount }));

  // The two historical charts cover the top-2 pipelines of the window. Their
  // ranking comes from the same datasets as the bar charts above, so the trend
  // and the ranking cannot disagree.
  const durationTrend = pivotWorkflowTrend(
    data.topSlowestDurationTrend,
    "averageDurationMinutes",
  );
  const failureTrend = pivotWorkflowTrend(data.topFailureTrend, "failedRuns");
  const isWeeklyBucket = days >= WEEKLY_BUCKET_THRESHOLD_DAYS;
  const bucketCaption = isWeeklyBucket ? "per week" : "per day";
  const trendSeries = (
    workflowNames: readonly string[],
  ): { color: string; key: string; name: string }[] =>
    workflowNames.map((name, index) => ({
      color: index === 0 ? colors.blue : colors.red,
      key: name,
      name,
    }));

  // Match the pie by dropping the unknown segment, then rank by the runs that
  // are actually drawn so the kept bars are the largest recorded totals; a
  // workflow with only unknown runs would render as an empty bar, so it is
  // dropped too. Missing data yields an empty chart, not a crash.
  const triggerBreakdown = [...(data.triggerBreakdown ?? [])]
    .filter((row) => row.automatic + row.manual > 0)
    .sort(
      (left, right) =>
        right.automatic + right.manual - (left.automatic + left.manual),
    )
    .map(({ automatic, manual, workflowName }) => ({
      automatic,
      manual,
      workflowName,
    }));

  // Same current-vs-previous comparison on every summary card, so a repo's
  // trend is readable without opening another dashboard.
  const deltaFromPrevious = (
    current: null | number,
    previous: null | number,
  ) =>
    current != null && previous != null
      ? percentChange(current, previous)
      : null;

  return (
    <>
      <DataFreshness
        className="mb-2"
        availableFrom={data.meta.availableFrom}
        availableTo={data.meta.availableTo}
        referenceDate={data.meta.referenceDate}
        windowEnd={data.meta.windowEnd}
        windowStart={data.meta.windowStart}
      />
      <InsightsPanel
        className="mb-6"
        insights={data.insights}
        periodDays={days}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="First Run in Period"
          tooltip={tooltipContent.firstRun}
          value={formatFullDate(data.summary.firstPipelineDate)}
        />
        <MetricCard
          deltaDirection="higher-is-better"
          deltaLabel="vs prev"
          deltaPct={deltaFromPrevious(
            data.summary.totalPipelines,
            data.summary.previousTotalPipelines,
          )}
          label="Successful Runs"
          previousValue={data.summary.previousTotalPipelines}
          tooltip={tooltipContent.runsCount}
          value={data.summary.totalPipelines}
        />
        <MetricCard
          breakdown={durationBreakdown}
          deltaDirection="lower-is-better"
          deltaLabel="vs prev"
          deltaPct={deltaFromPrevious(
            data.summary.avgDurationMinutes,
            data.summary.previousAvgDurationMinutes,
          )}
          label="Average Duration"
          previousValue={data.summary.previousAvgDurationMinutes}
          sampleSize={data.durationPercentiles.count}
          suffix="min"
          tooltip={tooltipContent.avgDuration}
          value={
            data.summary.avgDurationMinutes !== null
              ? Number(data.summary.avgDurationMinutes).toFixed(1)
              : "—"
          }
        />
        <MetricCard
          deltaDirection="lower-is-better"
          deltaLabel="vs prev"
          deltaPct={deltaFromPrevious(
            data.summary.totalDurationMinutes,
            data.summary.previousTotalDurationMinutes,
          )}
          label="Total Duration"
          previousValue={data.summary.previousTotalDurationMinutes}
          suffix="min"
          tooltip={tooltipContent.totalDuration}
          value={
            data.summary.totalDurationMinutes !== null
              ? Number(data.summary.totalDurationMinutes).toFixed(0)
              : "—"
          }
        />
        <MetricCard
          deltaDirection="lower-is-better"
          deltaLabel="vs prev"
          deltaPct={deltaFromPrevious(
            data.summary.failedDurationMinutes,
            data.summary.previousFailedDurationMinutes,
          )}
          label="Time in Failed Runs"
          previousValue={data.summary.previousFailedDurationMinutes}
          suffix="min"
          tooltip={tooltipContent.failedRunDuration}
          value={
            data.summary.failedDurationMinutes !== null &&
            data.summary.failedDurationMinutes !== undefined
              ? Number(data.summary.failedDurationMinutes).toFixed(0)
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SimpleBarChart
          bars={[
            {
              color: colors.blue,
              key: "weeklyDeploymentCount",
              name: "Deployments",
            },
          ]}
          data={data.deployments}
          title="Deploy / Release Workflow Runs (weekly)"
          tooltip={tooltipContent.deploymentsToProduction}
          unit="runs"
          xKey="runWeek"
          xValueFormatter={shortDateTick}
        />
        <SimpleLineChart
          data={dxVsNonDxPivoted}
          lines={[
            { color: colors.blue, key: "dx", name: "DX Pipelines" },
            {
              color: colors.red,
              key: "non_dx",
              name: "Non-DX Pipelines",
            },
          ]}
          title="DX VS Non-DX Pipeline Runs (Cumulative)"
          tooltip={tooltipContent.dxVsNonDx}
          unit="runs"
          xKey="runDate"
          xValueFormatter={shortDateTick}
        />
        <SimpleBarChart
          bars={[
            {
              color: colors.red,
              key: "failedRuns",
              name: "Failed Runs",
            },
          ]}
          caption="top 10"
          data={data.failures}
          layout="vertical"
          maxItems={10}
          sortKey="failedRuns"
          title="Pipeline Failures"
          tooltip={tooltipContent.pipelineFailures}
          tooltipFormatter={(value) => value.toFixed(0)}
          unit="failures"
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={trendSeries(failureTrend.workflowNames)}
          caption={`${bucketCaption} · top 2 pipelines by failed runs`}
          data={failureTrend.data}
          title="Top 2 Most Failing Pipelines — Failures in Time"
          tooltip={tooltipContent.failureTrend}
          tooltipFormatter={(value) => value.toFixed(0)}
          unit="failures"
          xKey="bucket"
          xValueFormatter={shortDateTick}
        />
        <SimpleBarChart
          bars={[
            {
              color: colors.blue,
              key: "averageDurationMinutes",
              name: "Avg Duration",
            },
          ]}
          caption="top 10"
          data={data.avgDuration}
          layout="vertical"
          maxItems={10}
          sortKey="averageDurationMinutes"
          title="Pipeline Average Duration (minutes)"
          tooltip={tooltipContent.avgPipelineDuration}
          unit="min"
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={trendSeries(durationTrend.workflowNames)}
          caption={`${bucketCaption} · top 2 pipelines by average duration`}
          data={durationTrend.data}
          title="Top 2 Slowest Pipelines — Average Duration (minutes)"
          tooltip={tooltipContent.durationTrend}
          tooltipFormatter={(value) => value.toFixed(1)}
          unit="min"
          xKey="bucket"
          xValueFormatter={shortDateTick}
        />
        <SimpleBarChart
          bars={[{ color: colors.green, key: "runCount", name: "Run Count" }]}
          caption="top 10"
          data={data.runCount}
          layout="vertical"
          maxItems={10}
          sortKey="runCount"
          title="Pipeline Run Count"
          tooltip={tooltipContent.pipelineRunCount}
          tooltipFormatter={(value) => value.toFixed(0)}
          unit="runs"
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={[
            {
              color: colors.purple,
              key: "cumulativeDurationMinutes",
              name: "Cumulative Duration",
            },
          ]}
          caption="top 10"
          data={data.cumulativeDuration}
          layout="vertical"
          maxItems={10}
          sortKey="cumulativeDurationMinutes"
          title="Pipeline Cumulative Duration (minutes)"
          tooltip={tooltipContent.cumulativeDuration}
          unit="min"
          xKey="workflowName"
        />
        <SimplePieChart
          caption={triggerExclusionCaption}
          data={triggerDistribution}
          title="Workflow Runs by Trigger"
          tooltip={tooltipContent.triggerTypes}
        />
        <SimpleBarChart
          bars={[
            {
              color: colors.blue,
              key: "automatic",
              name: "Automatic",
              stackId: "trigger",
            },
            {
              color: colors.amber,
              key: "manual",
              name: "Manual",
              stackId: "trigger",
            },
          ]}
          caption={triggerExclusionCaption}
          data={triggerBreakdown}
          layout="vertical"
          maxItems={10}
          title="Trigger Breakdown by Workflow"
          tooltip={tooltipContent.triggerBreakdown}
          tooltipFormatter={(value) => value.toFixed(0)}
          unit="runs"
          xKey="workflowName"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={[
            { key: "workflowName", label: "Workflow" },
            { key: "totalRuns", label: "Total Runs" },
            { key: "successfulRuns", label: "Successful" },
            { key: "failedRuns", label: "Failed" },
            { key: "successRatePercentage", label: "Success Rate (%)" },
          ]}
          data={data.successRatio}
          title="Workflow Success/Failure Ratio"
          tooltip={tooltipContent.successFailureRatio}
        />
      </div>
    </>
  );
}
