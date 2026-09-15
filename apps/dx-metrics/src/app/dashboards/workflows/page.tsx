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
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import type { Insight } from "@/lib/insights/types";
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
        <TooltipIcon content={tooltipContent.title} side="right" />
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
      {data && <WorkflowsDashboardContent data={data} />}
    </div>
  );
}

function formatDate(value: unknown): string {
  const str = String(value);
  if (!str) return str;
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return str;
  }
}

function WorkflowsDashboardContent({ data }: { data: WorkflowDashboardData }) {
  const dxVsNonDxPivoted = pivotCumulativeSeries(
    data.dxVsNonDx,
    "pipelineType",
    {
      "DX Pipelines": "dx",
      "Non-DX Pipelines": "non_dx",
    },
  );

  return (
    <>
      <DataFreshness className="mb-2" referenceDate={data.meta.referenceDate} />
      <InsightsPanel className="mb-6" insights={data.insights} />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="First Run"
          tooltip={tooltipContent.firstRun}
          value={formatDate(data.summary.firstPipelineDate)}
        />
        <MetricCard
          label="Runs Count"
          tooltip={tooltipContent.runsCount}
          value={data.summary.totalPipelines}
        />
        <MetricCard
          label="Average Duration"
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

      <div className="grid grid-cols-2 gap-4">
        <SimpleBarChart
          bars={[
            {
              color: "#2563eb",
              key: "weeklyDeploymentCount",
              name: "Deployments",
            },
          ]}
          data={data.deployments}
          title="Deploy / Release Workflow Runs (weekly)"
          tooltip={tooltipContent.deploymentsToProduction}
          xKey="runWeek"
          xValueFormatter={formatDate}
        />
        <SimpleLineChart
          data={dxVsNonDxPivoted}
          lines={[
            { color: "#2563eb", key: "dx", name: "DX Pipelines" },
            { color: "#dc2626", key: "non_dx", name: "Non-DX Pipelines" },
          ]}
          title="DX VS Non-DX Pipeline Runs (Cumulative)"
          tooltip={tooltipContent.dxVsNonDx}
          xKey="runDate"
          xValueFormatter={formatDate}
        />
        <SimpleBarChart
          bars={[{ color: "#c97d9b", key: "failedRuns", name: "Failed Runs" }]}
          data={data.failures}
          layout="vertical"
          title="Pipeline Failures"
          tooltip={tooltipContent.pipelineFailures}
          tooltipFormatter={(value) => value.toFixed(0)}
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={[
            {
              color: "#2563eb",
              key: "averageDurationMinutes",
              name: "Avg Duration",
            },
          ]}
          data={data.avgDuration}
          layout="vertical"
          title="Pipeline Average Duration (minutes)"
          tooltip={tooltipContent.avgPipelineDuration}
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={[{ color: "#16a34a", key: "runCount", name: "Run Count" }]}
          data={data.runCount}
          layout="vertical"
          title="Pipeline Run Count"
          tooltip={tooltipContent.pipelineRunCount}
          tooltipFormatter={(value) => value.toFixed(0)}
          xKey="workflowName"
        />
        <SimpleBarChart
          bars={[
            {
              color: "#7c3aed",
              key: "cumulativeDurationMinutes",
              name: "Cumulative Duration",
            },
          ]}
          data={data.cumulativeDuration}
          layout="vertical"
          title="Pipeline Cumulative Duration (minutes)"
          tooltip={tooltipContent.cumulativeDuration}
          xKey="workflowName"
        />
        <SimpleLineChart
          data={data.infraPlan}
          lines={[
            { color: "#2563eb", key: "durationMinutes", name: "Duration" },
          ]}
          title="Infra Plan Duration (minutes)"
          tooltip={tooltipContent.infraPlanDuration}
          xKey="runTimestamp"
          xValueFormatter={formatDate}
        />
        <SimpleLineChart
          data={data.infraApply}
          lines={[
            { color: "#16a34a", key: "durationMinutes", name: "Duration" },
          ]}
          title="Infra Apply Duration (minutes)"
          tooltip={tooltipContent.infraApplyDuration}
          xKey="runTimestamp"
          xValueFormatter={formatDate}
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
