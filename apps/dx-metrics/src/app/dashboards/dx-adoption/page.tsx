"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { SimplePieChart, DataTable } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import { dxAdoptionTooltips as tooltipContent } from "./tooltips";

interface DxAdoptionData {
  pipelineAdoption: { pipeline_type: string; pipeline_count: number }[];
  moduleAdoption: { module_type: string; module_count: number }[];
  workflowsList: { workflow_name: string; pipeline_type: string }[];
  modulesList: {
    module_name: string;
    module_type: string;
    file_path: string;
  }[];
  versionDriftList: {
    module_name: string;
    used_version: string | null;
    latest_version: string | null;
    file_path: string | null;
    drift_status: string;
  }[];
  versionDriftSummary: {
    upToDate: number;
    outdated: number;
    unknown: number;
    total: number;
  };
}

export default function DxAdoptionDashboard() {
  const { repository, setRepository } = useDashboardFilters({
    mode: "repository-only",
  });

  const { data, loading, error, refetch } =
    useDashboardData<DxAdoptionData>("dx-adoption", {
      repository,
    });

  const pipelinePie =
    data?.pipelineAdoption.map((r) => ({
      name: r.pipeline_type,
      value: Number(r.pipeline_count),
    })) || [];

  const modulePie =
    data?.moduleAdoption.map((r) => ({
      name: r.module_type,
      value: Number(r.module_count),
    })) || [];

  const driftSummary = data?.versionDriftSummary;
  const driftUpToDatePct =
    driftSummary && driftSummary.total > 0
      ? Math.round((driftSummary.upToDate / driftSummary.total) * 100)
      : null;

  const driftStatusBadge = (status: string) => {
    if (status === "up-to-date")
      return (
        <span className="inline-block whitespace-nowrap rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          🟢 up-to-date
        </span>
      );
    if (status === "outdated")
      return (
        <span className="inline-block whitespace-nowrap rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          🟡 outdated
        </span>
      );
    return (
      <span className="inline-block whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        ⚪ unknown
      </span>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          DX Tools Adoption Metrics
        </h2>
        <TooltipIcon content={tooltipContent.title} />
      </div>
      <DashboardFilters
        mode="repository-only"
        repository={repository}
        onRepositoryChange={setRepository}
      />
      <DashboardRequestState
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SimplePieChart
              title="DX Pipeline Adoption"
              data={pipelinePie}
              tooltip={tooltipContent.pipelineAdoption}
            />
            <SimplePieChart
              title="DX Terraform Modules Adoption"
              data={modulePie}
              tooltip={tooltipContent.moduleAdoption}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              title="Workflows List"
              columns={[
                { key: "workflow_name", label: "Workflow" },
                { key: "pipeline_type", label: "Type" },
              ]}
              data={data.workflowsList}
              tooltip={tooltipContent.workflowsList}
            />
            <DataTable
              title="Terraform Modules List"
              columns={[
                { key: "module_name", label: "Module" },
                { key: "module_type", label: "Type" },
                { key: "file_path", label: "File Path" },
              ]}
              data={data.modulesList}
              tooltip={tooltipContent.modulesList}
            />
          </div>

          {/* Version Drift */}
          {data.versionDriftList.length > 0 && (
            <>
              <h3 className="mt-8 mb-4 text-base font-semibold text-white">
                Version Drift
              </h3>
              <div className="mb-4 grid grid-cols-4 gap-4">
                <MetricCard
                  label="DX Modules Up-to-Date"
                  value={
                    driftSummary
                      ? `${driftSummary.upToDate}/${driftSummary.total}`
                      : null
                  }
                  tooltip={tooltipContent.upToDatePercentage}
                />
                <MetricCard
                  label="Up-to-Date %"
                  value={driftUpToDatePct}
                  suffix="%"
                  tooltip={tooltipContent.upToDatePercentage}
                />
                <MetricCard
                  label="Outdated Modules"
                  value={driftSummary?.outdated ?? null}
                  tooltip={tooltipContent.outdatedModules}
                />
                <MetricCard
                  label="Unknown Version"
                  value={driftSummary?.unknown ?? null}
                  tooltip={tooltipContent.unknownVersions}
                />
              </div>
              <DataTable
                title="DX Module Version Drift"
                columns={[
                  { key: "module_name", label: "Module" },
                  { key: "used_version", label: "Used Version" },
                  { key: "latest_version", label: "Latest Version" },
                  { key: "file_path", label: "File" },
                  {
                    key: "drift_status",
                    label: "Status",
                    renderCell: (value) =>
                      driftStatusBadge(String(value ?? "unknown")),
                  },
                ]}
                data={data.versionDriftList}
                tooltip={tooltipContent.versionDrift}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
