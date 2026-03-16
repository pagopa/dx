"use client";

import { DataTable, SimplePieChart } from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { dxAdoptionTooltips as tooltipContent } from "./tooltips";

interface DxAdoptionData {
  moduleAdoption: { moduleCount: number; moduleType: string }[];
  modulesList: {
    filePath: string;
    moduleName: string;
    moduleType: string;
  }[];
  pipelineAdoption: { pipelineCount: number; pipelineType: string }[];
  versionDriftList: {
    driftStatus: string;
    filePath: null | string;
    latestVersion: null | string;
    moduleName: string;
    usedVersion: null | string;
  }[];
  versionDriftSummary: {
    outdated: number;
    total: number;
    unknown: number;
    upToDate: number;
  };
  workflowsList: { pipelineType: string; workflowName: string }[];
}

export default function DxAdoptionDashboard() {
  const { repository, setRepository } = useDashboardFilters({
    mode: "repository-only",
  });

  const { data, error, loading, refetch } = useDashboardData<DxAdoptionData>(
    "dx-adoption",
    {
      repository,
    },
  );

  const pipelinePie =
    data?.pipelineAdoption.map((r) => ({
      name: r.pipelineType,
      value: Number(r.pipelineCount),
    })) || [];

  const modulePie =
    data?.moduleAdoption.map((r) => ({
      name: r.moduleType,
      value: Number(r.moduleCount),
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
        onRepositoryChange={setRepository}
        repository={repository}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SimplePieChart
              data={pipelinePie}
              title="DX Pipeline Adoption"
              tooltip={tooltipContent.pipelineAdoption}
            />
            <SimplePieChart
              data={modulePie}
              title="DX Terraform Modules Adoption"
              tooltip={tooltipContent.moduleAdoption}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              columns={[
                { key: "workflowName", label: "Workflow" },
                { key: "pipelineType", label: "Type" },
              ]}
              data={data.workflowsList}
              title="Workflows List"
              tooltip={tooltipContent.workflowsList}
            />
            <DataTable
              columns={[
                { key: "moduleName", label: "Module" },
                { key: "moduleType", label: "Type" },
                { key: "filePath", label: "File Path" },
              ]}
              data={data.modulesList}
              title="Terraform Modules List"
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
                  tooltip={tooltipContent.upToDatePercentage}
                  value={
                    driftSummary
                      ? `${driftSummary.upToDate}/${driftSummary.total}`
                      : null
                  }
                />
                <MetricCard
                  label="Up-to-Date %"
                  suffix="%"
                  tooltip={tooltipContent.upToDatePercentage}
                  value={driftUpToDatePct}
                />
                <MetricCard
                  label="Outdated Modules"
                  tooltip={tooltipContent.outdatedModules}
                  value={driftSummary?.outdated ?? null}
                />
                <MetricCard
                  label="Unknown Version"
                  tooltip={tooltipContent.unknownVersions}
                  value={driftSummary?.unknown ?? null}
                />
              </div>
              <DataTable
                columns={[
                  { key: "moduleName", label: "Module" },
                  { key: "usedVersion", label: "Used Version" },
                  { key: "latestVersion", label: "Latest Version" },
                  { key: "filePath", label: "File" },
                  {
                    key: "driftStatus",
                    label: "Status",
                    renderCell: (value) =>
                      driftStatusBadge(String(value ?? "unknown")),
                  },
                ]}
                data={data.versionDriftList}
                title="DX Module Version Drift"
                tooltip={tooltipContent.versionDrift}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
