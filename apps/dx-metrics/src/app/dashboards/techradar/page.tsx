/** This module renders the Techradar dashboard UI. */

"use client";

import Link from "next/link";

import { DataTable, SimpleBarChart, SimplePieChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";

import { techradarTooltips as tooltipContent } from "./tooltips";

interface TechradarDashboardData {
  adoptionByTool: {
    adoption_percentage: number;
    radar_ref: null | string;
    radar_ring: null | string;
    radar_slug: null | string;
    radar_status: string;
    radar_title: null | string;
    repository_count: number;
    tool_key: string;
    tool_name: string;
  }[];
  repositoriesWithoutDetectedTools: string[];
  repositoryCoverage: {
    aligned_tools: number;
    detected_tools: number;
    repository: string;
  }[];
  repositoryMatrix: {
    evidence_path: null | string;
    radar_ref: null | string;
    radar_ring: null | string;
    radar_status: string;
    radar_status_label: string;
    radar_title: null | string;
    repository: string;
    tool_name: string;
  }[];
  statusDistribution: { name: string; value: number }[];
  summary: {
    aligned_usages: number;
    detected_usages: number;
    repositories_total: number;
    repositories_with_detected_tools: number;
    tools_detected: number;
    usages_not_in_radar: number;
  };
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
      adoption_percentage: tool.adoption_percentage,
      tool_name: tool.tool_name,
    })) ?? [];
  const statusPieData = data?.statusDistribution ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Techradar Metrics</h2>
        <TooltipIcon content={tooltipContent.title} />
      </div>
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Repositories Analyzed"
              tooltip={tooltipContent.repositoriesAnalysed}
              value={data.summary.repositories_total}
            />
            <MetricCard
              label="Repositories With Detections"
              tooltip={tooltipContent.repositoriesWithDetectedTools}
              value={data.summary.repositories_with_detected_tools}
            />
            <MetricCard
              label="Unique Tools Detected"
              tooltip={tooltipContent.toolsDetected}
              value={data.summary.tools_detected}
            />
            <MetricCard
              label="Detections Not In Radar"
              tooltip={tooltipContent.usagesNotInRadar}
              value={data.summary.usages_not_in_radar}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SimpleBarChart
              bars={[
                {
                  color: "#2563eb",
                  key: "adoption_percentage",
                  name: "Adoption %",
                },
              ]}
              data={adoptionBarData}
              layout="vertical"
              title="Tool Adoption by Repository Coverage"
              tooltip={tooltipContent.adoptionByTool}
              xKey="tool_name"
            />
            <SimplePieChart
              data={statusPieData}
              title="Detected Tool Distribution by Radar Status"
              tooltip={tooltipContent.statusDistribution}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              columns={[
                { key: "tool_name", label: "Tool" },
                { key: "repository_count", label: "Repositories" },
                { key: "adoption_percentage", label: "Adoption %" },
                {
                  key: "radar_status",
                  label: "Radar Status",
                  renderCell: (value, row) => (
                    <span
                      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClassName(String(value ?? ""))}`}
                    >
                      {row.radar_ring ?? "not in radar"}
                    </span>
                  ),
                },
                {
                  key: "radar_ref",
                  label: "Radar Entry",
                  renderCell: (value, row) =>
                    value ? (
                      <Link
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        href={String(value)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.radar_title ?? row.radar_slug ?? "Open entry"}
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
                { key: "detected_tools", label: "Detected Tools" },
                { key: "aligned_tools", label: "Aligned Tools" },
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
                { key: "tool_name", label: "Tool" },
                {
                  key: "radar_status_label",
                  label: "Radar Status",
                  renderCell: (value, row) => (
                    <span
                      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClassName(row.radar_status)}`}
                    >
                      {String(value)}
                    </span>
                  ),
                },
                {
                  key: "radar_ref",
                  label: "Radar Entry",
                  renderCell: (value, row) =>
                    value ? (
                      <Link
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        href={String(value)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.radar_title ?? "Open entry"}
                      </Link>
                    ) : (
                      "—"
                    ),
                },
                { key: "evidence_path", label: "Evidence Path" },
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
