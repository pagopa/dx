"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import {
  SimpleLineChart,
  SimpleBarChart,
  DataTable,
} from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { pivotCumulativeSeries } from "@/lib/pivot-cumulative-series";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import { workflowsTooltips as tooltipContent } from "./tooltips";

interface WorkflowDashboardData {
  summary: {
    total_pipelines: number;
    avg_duration_minutes: number;
    total_duration_minutes: number;
    first_pipeline_date: string;
  };
  deployments: { run_week: string; weekly_deployment_count: number }[];
  dxVsNonDx: {
    run_date: string;
    pipeline_type: string;
    cumulative_count: number;
  }[];
  failures: { workflow_name: string; failed_runs: number }[];
  avgDuration: {
    workflow_name: string;
    average_duration_minutes: number;
  }[];
  runCount: { workflow_name: string; run_count: number }[];
  cumulativeDuration: {
    workflow_name: string;
    cumulative_duration_minutes: number;
  }[];
  infraPlan: { run_timestamp: string; duration_minutes: number }[];
  infraApply: { run_timestamp: string; duration_minutes: number }[];
  successRatio: {
    workflow_name: string;
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    success_rate_percentage: number;
  }[];
}

export default function WorkflowsDashboard() {
  const { repository, days, setRepository, setDays } = useDashboardFilters();

  const { data, loading, error, refetch } =
    useDashboardData<WorkflowDashboardData>("workflows", {
      repository,
      days,
    });

  const formatDate = (value: string) => {
    if (!value) return value;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleDateString("it-IT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const dxVsNonDxPivoted = data
    ? pivotCumulativeSeries(data.dxVsNonDx, "pipeline_type", {
        "DX Pipelines": "dx",
        "Non-DX Pipelines": "non_dx",
      })
    : [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Workflow Metrics</h2>
        <TooltipIcon content={tooltipContent.title} side="right" />
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
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="First Run"
              value={formatDate(data.summary.first_pipeline_date)}
              tooltip={tooltipContent.firstRun}
            />
            <MetricCard
              label="Runs Count"
              value={data.summary.total_pipelines}
              tooltip={tooltipContent.runsCount}
            />
            <MetricCard
              label="Average Duration"
              value={
                data.summary.avg_duration_minutes !== null
                  ? Number(data.summary.avg_duration_minutes).toFixed(1)
                  : "—"
              }
              suffix="min"
              tooltip={tooltipContent.avgDuration}
            />
            <MetricCard
              label="Total Duration"
              value={
                data.summary.total_duration_minutes !== null
                  ? Number(data.summary.total_duration_minutes).toFixed(0)
                  : "—"
              }
              suffix="min"
              tooltip={tooltipContent.totalDuration}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SimpleBarChart
              title="Deployments to Production (weekly)"
              data={data.deployments}
              xKey="run_week"
              xValueFormatter={formatDate}
              tooltip={tooltipContent.deploymentsToProduction}
              bars={[
                {
                  key: "weekly_deployment_count",
                  name: "Deployments",
                  color: "#2563eb",
                },
              ]}
            />
            <SimpleLineChart
              title="DX VS Non-DX Pipeline Runs (Cumulative)"
              data={dxVsNonDxPivoted}
              xKey="run_date"
              xValueFormatter={formatDate}
              tooltip={tooltipContent.dxVsNonDx}
              lines={[
                { key: "dx", name: "DX Pipelines", color: "#2563eb" },
                { key: "non_dx", name: "Non-DX Pipelines", color: "#dc2626" },
              ]}
            />
            <SimpleBarChart
              title="Pipeline Failures"
              data={data.failures}
              xKey="workflow_name"
              tooltip={tooltipContent.pipelineFailures}
              bars={[
                {
                  key: "failed_runs",
                  name: "Failed Runs",
                  color: "#c97d9b",
                },
              ]}
              layout="vertical"
            />
            <SimpleBarChart
              title="Pipeline Average Duration (minutes)"
              data={data.avgDuration}
              xKey="workflow_name"
              tooltip={tooltipContent.avgPipelineDuration}
              bars={[
                {
                  key: "average_duration_minutes",
                  name: "Avg Duration",
                  color: "#2563eb",
                },
              ]}
              layout="vertical"
            />
            <SimpleBarChart
              title="Pipeline Run Count"
              data={data.runCount}
              xKey="workflow_name"
              tooltip={tooltipContent.pipelineRunCount}
              bars={[{ key: "run_count", name: "Run Count", color: "#16a34a" }]}
              layout="vertical"
            />
            <SimpleBarChart
              title="Pipeline Cumulative Duration (minutes)"
              data={data.cumulativeDuration}
              xKey="workflow_name"
              tooltip={tooltipContent.cumulativeDuration}
              bars={[
                {
                  key: "cumulative_duration_minutes",
                  name: "Cumulative Duration",
                  color: "#7c3aed",
                },
              ]}
              layout="vertical"
            />
            <SimpleLineChart
              title="Infra Plan Duration (minutes)"
              data={data.infraPlan}
              xKey="run_timestamp"
              xValueFormatter={formatDate}
              tooltip={tooltipContent.infraPlanDuration}
              lines={[
                {
                  key: "duration_minutes",
                  name: "Duration",
                  color: "#2563eb",
                },
              ]}
            />
            <SimpleLineChart
              title="Infra Apply Duration (minutes)"
              data={data.infraApply}
              xKey="run_timestamp"
              xValueFormatter={formatDate}
              tooltip={tooltipContent.infraApplyDuration}
              lines={[
                {
                  key: "duration_minutes",
                  name: "Duration",
                  color: "#16a34a",
                },
              ]}
            />
          </div>

          <div className="mt-4">
            <DataTable
              title="Workflow Success/Failure Ratio"
              tooltip={tooltipContent.successFailureRatio}
              columns={[
                { key: "workflow_name", label: "Workflow" },
                { key: "total_runs", label: "Total Runs" },
                { key: "successful_runs", label: "Successful" },
                { key: "failed_runs", label: "Failed" },
                { key: "success_rate_percentage", label: "Success Rate (%)" },
              ]}
              data={data.successRatio}
            />
          </div>
        </>
      )}
    </div>
  );
}
