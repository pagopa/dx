"use client";

import {
  DataTable,
  SimpleBarChart,
  SimpleLineChart,
} from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { workflowsTooltips as tooltipContent } from "./tooltips";

interface WorkflowDashboardData {
  avgDuration: { average_duration_minutes: number; workflow_name: string }[];
  cumulativeDuration: {
    cumulative_duration_minutes: number;
    workflow_name: string;
  }[];
  deployments: { run_week: string; weekly_deployment_count: number }[];
  dxVsNonDx: {
    cumulative_count: number;
    pipeline_type: string;
    run_date: string;
  }[];
  failures: { failed_runs: number; workflow_name: string }[];
  infraApply: { duration_minutes: number; run_timestamp: string }[];
  infraPlan: { duration_minutes: number; run_timestamp: string }[];
  runCount: { run_count: number; workflow_name: string }[];
  successRatio: {
    failed_runs: number;
    success_rate_percentage: number;
    successful_runs: number;
    total_runs: number;
    workflow_name: string;
  }[];
  summary: {
    avg_duration_minutes: number;
    first_pipeline_date: string;
    total_duration_minutes: number;
    total_pipelines: number;
  };
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
    "pipeline_type",
    {
      "DX Pipelines": "dx",
      "Non-DX Pipelines": "non_dx",
    },
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="First Run"
          tooltip={tooltipContent.firstRun}
          value={formatDate(data.summary.first_pipeline_date)}
        />
        <MetricCard
          label="Runs Count"
          tooltip={tooltipContent.runsCount}
          value={data.summary.total_pipelines}
        />
        <MetricCard
          label="Average Duration"
          suffix="min"
          tooltip={tooltipContent.avgDuration}
          value={
            data.summary.avg_duration_minutes !== null
              ? Number(data.summary.avg_duration_minutes).toFixed(1)
              : "—"
          }
        />
        <MetricCard
          label="Total Duration"
          suffix="min"
          tooltip={tooltipContent.totalDuration}
          value={
            data.summary.total_duration_minutes !== null
              ? Number(data.summary.total_duration_minutes).toFixed(0)
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SimpleBarChart
          bars={[
            {
              color: "#2563eb",
              key: "weekly_deployment_count",
              name: "Deployments",
            },
          ]}
          data={data.deployments}
          title="Deployments to Production (weekly)"
          tooltip={tooltipContent.deploymentsToProduction}
          xKey="run_week"
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
          xKey="run_date"
          xValueFormatter={formatDate}
        />
        <SimpleBarChart
          bars={[{ color: "#c97d9b", key: "failed_runs", name: "Failed Runs" }]}
          data={data.failures}
          layout="vertical"
          title="Pipeline Failures"
          tooltip={tooltipContent.pipelineFailures}
          xKey="workflow_name"
        />
        <SimpleBarChart
          bars={[
            {
              color: "#2563eb",
              key: "average_duration_minutes",
              name: "Avg Duration",
            },
          ]}
          data={data.avgDuration}
          layout="vertical"
          title="Pipeline Average Duration (minutes)"
          tooltip={tooltipContent.avgPipelineDuration}
          xKey="workflow_name"
        />
        <SimpleBarChart
          bars={[{ color: "#16a34a", key: "run_count", name: "Run Count" }]}
          data={data.runCount}
          layout="vertical"
          title="Pipeline Run Count"
          tooltip={tooltipContent.pipelineRunCount}
          xKey="workflow_name"
        />
        <SimpleBarChart
          bars={[
            {
              color: "#7c3aed",
              key: "cumulative_duration_minutes",
              name: "Cumulative Duration",
            },
          ]}
          data={data.cumulativeDuration}
          layout="vertical"
          title="Pipeline Cumulative Duration (minutes)"
          tooltip={tooltipContent.cumulativeDuration}
          xKey="workflow_name"
        />
        <SimpleLineChart
          data={data.infraPlan}
          lines={[
            { color: "#2563eb", key: "duration_minutes", name: "Duration" },
          ]}
          title="Infra Plan Duration (minutes)"
          tooltip={tooltipContent.infraPlanDuration}
          xKey="run_timestamp"
          xValueFormatter={formatDate}
        />
        <SimpleLineChart
          data={data.infraApply}
          lines={[
            { color: "#16a34a", key: "duration_minutes", name: "Duration" },
          ]}
          title="Infra Apply Duration (minutes)"
          tooltip={tooltipContent.infraApplyDuration}
          xKey="run_timestamp"
          xValueFormatter={formatDate}
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={[
            { key: "workflow_name", label: "Workflow" },
            { key: "total_runs", label: "Total Runs" },
            { key: "successful_runs", label: "Successful" },
            { key: "failed_runs", label: "Failed" },
            { key: "success_rate_percentage", label: "Success Rate (%)" },
          ]}
          data={data.successRatio}
          title="Workflow Success/Failure Ratio"
          tooltip={tooltipContent.successFailureRatio}
        />
      </div>
    </>
  );
}
