/** This module renders the Techradar dashboard UI. */

"use client";

import Link from "next/link";

import {
  DataTable,
  SERIES_COLORS,
  SimpleBarChart,
  SimplePieChart,
} from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";

import { techradarTooltips as tooltipContent } from "./tooltips";

interface TechradarDashboardData {
  adoptionByTool: {
    adoptionPercentage: number;
    radarRef: null | string;
    radarRing: null | string;
    radarSlug: null | string;
    radarStatus: string;
    radarTitle: null | string;
    repositoryCount: number;
    toolKey: string;
    toolName: string;
  }[];
  repositoriesWithoutDetectedTools: string[];
  repositoryCoverage: {
    alignedTools: number;
    detectedTools: number;
    repository: string;
  }[];
  repositoryMatrix: {
    evidencePath: null | string;
    radarRef: null | string;
    radarRing: null | string;
    radarStatus: string;
    radarStatusLabel: string;
    radarTitle: null | string;
    repository: string;
    toolName: string;
  }[];
  statusDistribution: { name: string; value: number }[];
  summary: {
    alignedUsages: number;
    detectedUsages: number;
    repositoriesTotal: number;
    repositoriesWithDetectedTools: number;
    toolsDetected: number;
    usagesNotInRadar: number;
  };
  insights: Insight[];
  meta: { referenceDate: string };
  usageTrend: {
    capturedAt: string;
    radarRing: null | string;
    radarStatus: string;
    repositoryCount: number;
    toolKey: string;
    toolName: string;
  }[];
}

const statusBadgeClassName = (status: string): string => {
  if (status === "aligned") {
    return "bg-green-100 text-green-800";
  }

  return "bg-yellow-100 text-yellow-800";
};

export default function TechradarDashboard() {
  const { data, error, loading, refetch } =
    useDashboardData<TechradarDashboardData>("techradar", {});

  const adoptionBarData =
    data?.adoptionByTool.map((tool) => ({
      adoptionPercentage: tool.adoptionPercentage,
      toolName: tool.toolName,
    })) ?? [];
  const statusPieData = data?.statusDistribution ?? [];

  const usageTrendByDate = new Map<string, number>();
  for (const row of data?.usageTrend ?? []) {
    const date = row.capturedAt.slice(0, 10);
    usageTrendByDate.set(
      date,
      (usageTrendByDate.get(date) ?? 0) + Number(row.repositoryCount),
    );
  }
  const usageTrendData = [...usageTrendByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, repositoryCount]) => ({ date, repositoryCount }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Techradar Metrics</h2>
        <TooltipIcon content={tooltipContent.title} label="Techradar Metrics" />
      </div>
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
          />
          <InsightsPanel className="mb-6" insights={data.insights} />
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Repositories Analyzed"
              tooltip={tooltipContent.repositoriesAnalysed}
              value={data.summary.repositoriesTotal}
            />
            <MetricCard
              label="Repositories With Detections"
              tooltip={tooltipContent.repositoriesWithDetectedTools}
              value={data.summary.repositoriesWithDetectedTools}
            />
            <MetricCard
              label="Unique Tools Detected"
              tooltip={tooltipContent.toolsDetected}
              value={data.summary.toolsDetected}
            />
            <MetricCard
              label="Detections Not In Radar"
              tooltip={tooltipContent.usagesNotInRadar}
              value={data.summary.usagesNotInRadar}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: SERIES_COLORS.blue,
                  key: "adoptionPercentage",
                  name: "Adoption %",
                },
              ]}
              data={adoptionBarData}
              layout="vertical"
              title="Tool Adoption by Repository Coverage"
              tooltip={tooltipContent.adoptionByTool}
              xKey="toolName"
            />
            <SimplePieChart
              data={statusPieData}
              title="Detected Tool Distribution by Radar Status"
              tooltip={tooltipContent.statusDistribution}
            />
          </div>

          {usageTrendData.length > 1 && (
            <div className="mt-4">
              <SimpleBarChart
                bars={[
                  {
                    color: SERIES_COLORS.purple,
                    key: "repositoryCount",
                    name: "Detected usages",
                  },
                ]}
                data={usageTrendData}
                title="Detected Tool Usages Over Time"
                tooltip={tooltipContent.usageTrend}
                xKey="date"
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DataTable
              columns={[
                { key: "toolName", label: "Tool" },
                { key: "repositoryCount", label: "Repositories" },
                { key: "adoptionPercentage", label: "Adoption %" },
                {
                  key: "radarStatus",
                  label: "Radar Status",
                  renderCell: (value, row) => (
                    <span
                      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClassName(String(value ?? ""))}`}
                    >
                      {row.radarRing ?? "not in radar"}
                    </span>
                  ),
                },
                {
                  key: "radarRef",
                  label: "Radar Entry",
                  renderCell: (value, row) =>
                    value ? (
                      <Link
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        href={String(value)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.radarTitle ?? row.radarSlug ?? "Open entry"}
                      </Link>
                    ) : (
                      "—"
                    ),
                },
              ]}
              data={data.adoptionByTool}
              title="Techradar Adoption by Tool"
              tooltip={tooltipContent.adoptionByTool}
            />
            <DataTable
              columns={[
                { key: "repository", label: "Repository" },
                { key: "detectedTools", label: "Detected Tools" },
                { key: "alignedTools", label: "Aligned Tools" },
              ]}
              data={data.repositoryCoverage}
              title="Repository Coverage"
              tooltip={tooltipContent.repositoryCoverage}
            />
          </div>

          <div className="mt-4">
            <DataTable
              columns={[
                { key: "repository", label: "Repository" },
                { key: "toolName", label: "Tool" },
                {
                  key: "radarStatusLabel",
                  label: "Radar Status",
                  renderCell: (value, row) => (
                    <span
                      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClassName(row.radarStatus)}`}
                    >
                      {String(value)}
                    </span>
                  ),
                },
                {
                  key: "radarRef",
                  label: "Radar Entry",
                  renderCell: (value, row) =>
                    value ? (
                      <Link
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        href={String(value)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.radarTitle ?? "Open entry"}
                      </Link>
                    ) : (
                      "—"
                    ),
                },
                { key: "evidencePath", label: "Evidence Path" },
              ]}
              data={data.repositoryMatrix}
              title="Repository / Tool Matrix"
              tooltip={tooltipContent.repositoryMatrix}
            />
          </div>

          {data.repositoriesWithoutDetectedTools.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#30363d] bg-[#0d1117] p-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white">
                Repositories without detections
              </h3>
              <p className="text-sm text-[#8b949e]">
                {data.repositoriesWithoutDetectedTools.join(", ")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
