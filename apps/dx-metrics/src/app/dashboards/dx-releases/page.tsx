"use client";

import { DataTable, SimpleLineChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";

import { releasestooltips as tooltipContent } from "./tooltips";

interface ModuleSummary {
  first_release_date: string;
  last_release_date: string;
  latest_major: string;
  major_versions_count: string;
  module_name: string;
  provider: string;
  total_releases: string;
  versions_detail: string;
}

interface ReleasesDashboardData {
  modulesSummary: ModuleSummary[];
  releasesTimeline: ReleasesTimeline[];
  stats: ReleaseStats;
}

interface ReleaseStats {
  newestRelease: null | string;
  oldestRelease: null | string;
  totalMajorVersions: number;
  totalModules: number;
  totalReleases: number;
}

interface ReleasesTimeline {
  major_versions_introduced: string;
  month: string;
  total_releases: string;
}

export default function ReleasesDashboard() {
  const { data, error, loading, refetch } =
    useDashboardData<ReleasesDashboardData>("releases", {});

  const releasesTimelineChartData = (data?.releasesTimeline ?? []).map((r) => ({
    major_versions: Number(r.major_versions_introduced),
    month: r.month,
    total_releases: Number(r.total_releases),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
            Terraform Registry <span className="text-green-500">Releases</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tracking module evolution and versioning frequency.
          </p>
        </div>
        <TooltipIcon content={tooltipContent.title} />
      </div>

      <DashboardRequestState
        error={error}
        loading={loading}
        loadingMessage="Fetching registry data..."
        onRetry={refetch}
      />

      {data && (
        <div className="space-y-8">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Modules"
              tooltip={tooltipContent.totalModules}
              value={data.stats.totalModules}
            />
            <StatCard
              label="Major Versions"
              tooltip={tooltipContent.totalMajorVersions}
              value={data.stats.totalMajorVersions}
            />
            <StatCard
              label="Total Releases"
              tooltip={tooltipContent.totalReleases}
              value={data.stats.totalReleases}
            />
          </div>

          {/* Timeline chart */}
          <SimpleLineChart
            data={releasesTimelineChartData}
            lines={[
              {
                color: "#238636",
                key: "major_versions",
                name: "New Majors",
              },
            ]}
            title="Major Versions Trend (Monthly)"
            tooltip={tooltipContent.majorVersionsTrend}
            xKey="month"
          />

          {/* Detail table */}
          <DataTable
            columns={[
              {
                key: "module_name",
                label: "Module",
                renderCell: (value, row) => (
                  <a
                    className="text-blue-400 font-semibold hover:text-blue-300 hover:underline"
                    href={`https://registry.terraform.io/modules/pagopa-dx/${value}/${row.provider}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {String(value)}
                  </a>
                ),
              },
              { key: "provider", label: "Provider" },
              { key: "major_versions_count", label: "Majors" },
              { key: "latest_major", label: "Latest" },
              { key: "total_releases", label: "Releases" },
              { key: "first_release_date", label: "First Release" },
              { key: "last_release_date", label: "Last Release" },
              {
                key: "versions_detail",
                label: "History",
                renderCell: (v) => (
                  <span className="font-mono text-xs opacity-80">
                    {String(v)}
                  </span>
                ),
              },
            ]}
            data={data.modulesSummary}
            title="Module Catalog"
            tooltip={tooltipContent.moduleCatalog}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip?: string;
  value: null | number | string;
}) {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-all hover:border-[#8b949e]">
      <p className="text-xs font-medium uppercase tracking-wider text-white flex items-center gap-1">
        {label}
        {tooltip && <TooltipIcon content={tooltip} />}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tighter text-[#e6edf3]">
        {value ?? "—"}
      </p>
    </div>
  );
}
