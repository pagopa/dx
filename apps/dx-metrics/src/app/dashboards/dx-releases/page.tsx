"use client";

import { DashboardRequestState } from "@/components/dashboard-request-state";
import { SimpleLineChart, DataTable } from "@/components/Charts";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { releasestooltips as tooltipContent } from "./tooltips";

interface ReleaseStats {
  totalModules: number;
  totalMajorVersions: number;
  totalReleases: number;
  oldestRelease: string | null;
  newestRelease: string | null;
}

interface ModuleSummary {
  module_name: string;
  provider: string;
  major_versions_count: string;
  total_releases: string;
  first_release_date: string;
  last_release_date: string;
  latest_major: string;
  versions_detail: string;
}

interface ReleasesTimeline {
  month: string;
  major_versions_introduced: string;
  total_releases: string;
}

interface ReleasesDashboardData {
  stats: ReleaseStats;
  modulesSummary: ModuleSummary[];
  releasesTimeline: ReleasesTimeline[];
}

function StatCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string | number | null;
  tooltip?: string;
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

export default function ReleasesDashboard() {
  const { data, loading, error, refetch } =
    useDashboardData<ReleasesDashboardData>("releases", {});

  const releasesTimelineChartData = (data?.releasesTimeline ?? []).map((r) => ({
    month: r.month,
    major_versions: Number(r.major_versions_introduced),
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
        loading={loading}
        error={error}
        onRetry={refetch}
        loadingMessage="Fetching registry data..."
      />

      {data && (
        <div className="space-y-8">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Modules"
              value={data.stats.totalModules}
              tooltip={tooltipContent.totalModules}
            />
            <StatCard
              label="Major Versions"
              value={data.stats.totalMajorVersions}
              tooltip={tooltipContent.totalMajorVersions}
            />
            <StatCard
              label="Total Releases"
              value={data.stats.totalReleases}
              tooltip={tooltipContent.totalReleases}
            />
          </div>

          {/* Timeline chart */}
          <SimpleLineChart
            title="Major Versions Trend (Monthly)"
            data={releasesTimelineChartData}
            xKey="month"
            lines={[
              {
                key: "major_versions",
                name: "New Majors",
                color: "#238636",
              },
            ]}
            tooltip={tooltipContent.majorVersionsTrend}
          />

          {/* Detail table */}
          <DataTable
            title="Module Catalog"
            columns={[
              {
                key: "module_name",
                label: "Module",
                renderCell: (value, row) => (
                  <a
                    href={`https://registry.terraform.io/modules/pagopa-dx/${value}/${row.provider}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-semibold hover:text-blue-300 hover:underline"
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
            tooltip={tooltipContent.moduleCatalog}
          />
        </div>
      )}
    </div>
  );
}
