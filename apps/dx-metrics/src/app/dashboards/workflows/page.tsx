"use client";

import {
  DataTable,
  SERIES_COLORS,
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
import { formatInteger, formatNumber } from "@/lib/format";
import type { Insight } from "@/lib/insights/types";
import { useDateFormatters } from "@/lib/locale";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
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
  infraApply: { durationMinutes: number; runTimestamp: string }[];
  infraPlan: { durationMinutes: number; runTimestamp: string }[];
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
  insights: Insight[];
  meta: { referenceDate: string };
}

export default function WorkflowsDashboard() {
  const { days, repository, setDays, setRepository } = useDashboardFilters();

  const { data, error, loading, refetch } =
    useDashboardData<WorkflowDashboardData>("workflows", { days, repository });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Workflow Metrics</h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Workflow Metrics"
          side="right"
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

  return (
    <>
      <DataFreshness className="mb-2" referenceDate={data.meta.referenceDate} />
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
          label="Successful Runs"
          tooltip={tooltipContent.runsCount}
          value={data.summary.totalPipelines}
        />
        <MetricCard
          breakdown={durationBreakdown}
          label="Average Duration"
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
          label="Total Duration"
          suffix="min"
          tooltip={tooltipContent.totalDuration}
          value={
            data.summary.totalDurationMinutes !== null
              ? Number(data.summary.totalDurationMinutes).toFixed(0)
              : "—"
          }
        />
        <MetricCard
          label="Time in Failed Runs"
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
              color: SERIES_COLORS.blue,
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
            { color: SERIES_COLORS.blue, key: "dx", name: "DX Pipelines" },
            {
              color: SERIES_COLORS.red,
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
              color: SERIES_COLORS.red,
              key: "failedRuns",
              name: "Failed Runs",
            },
          ]}
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
          bars={[
            {
              color: SERIES_COLORS.blue,
              key: "averageDurationMinutes",
              name: "Avg Duration",
            },
          ]}
          data={data.avgDuration}
          layout="vertical"
          sortKey="averageDurationMinutes"
          title="Pipeline Average Duration (minutes)"
          tooltip={tooltipContent.avgPipelineDuration}
          unit="min"
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={[
            { color: SERIES_COLORS.green, key: "runCount", name: "Run Count" },
          ]}
          data={data.runCount}
          layout="vertical"
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
              color: SERIES_COLORS.purple,
              key: "cumulativeDurationMinutes",
              name: "Cumulative Duration",
            },
          ]}
          data={data.cumulativeDuration}
          layout="vertical"
          sortKey="cumulativeDurationMinutes"
          title="Pipeline Cumulative Duration (minutes)"
          tooltip={tooltipContent.cumulativeDuration}
          unit="min"
          xKey="workflowName"
        />
        <SimpleLineChart
          data={data.infraPlan}
          lines={[
            {
              color: SERIES_COLORS.blue,
              key: "durationMinutes",
              name: "Duration",
            },
          ]}
          title="Infra Plan Duration (minutes)"
          tooltip={tooltipContent.infraPlanDuration}
          unit="min"
          xKey="runTimestamp"
          xValueFormatter={shortDateTick}
        />
        <SimpleLineChart
          data={data.infraApply}
          lines={[
            {
              color: SERIES_COLORS.green,
              key: "durationMinutes",
              name: "Duration",
            },
          ]}
          title="Infra Apply Duration (minutes)"
          tooltip={tooltipContent.infraApplyDuration}
          unit="min"
          xKey="runTimestamp"
          xValueFormatter={shortDateTick}
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
              color: SERIES_COLORS.blue,
              key: "automatic",
              name: "Automatic",
              stackId: "trigger",
            },
            {
              color: SERIES_COLORS.amber,
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
