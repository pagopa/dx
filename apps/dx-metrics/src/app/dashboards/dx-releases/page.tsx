"use client";

import { DataTable, SimpleLineChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import { MetricCard } from "@/components/MetricCard";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";

import { releasesTooltips as tooltipContent } from "./tooltips";

interface ModuleSummary {
  firstReleaseDate: string;
  lastReleaseDate: string;
  latestMajor: string;
  majorVersionsCount: string;
  moduleName: string;
  provider: string;
  totalReleases: string;
  versionsDetail: string;
}

interface ReleasesDashboardData {
  modulesSummary: ModuleSummary[];
  releasesTimeline: ReleasesTimeline[];
  stats: ReleaseStats;
  insights: Insight[];
  meta: { referenceDate: string };
}

interface ReleaseStats {
  newestRelease: null | string;
  oldestRelease: null | string;
  totalMajorVersions: number;
  totalModules: number;
  totalReleases: number;
}

interface ReleasesTimeline {
  majorVersionsIntroduced: string;
  month: string;
  totalReleases: string;
}

export default function ReleasesDashboard() {
  const colors = useSeriesColors();
  const { data, error, loading, refetch } =
    useDashboardData<ReleasesDashboardData>("releases", {});

  const releasesTimelineChartData = (data?.releasesTimeline ?? []).map((r) => ({
    major_versions: Number(r.majorVersionsIntroduced),
    month: r.month,
    totalReleases: Number(r.totalReleases),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Terraform Registry <span className="text-accent">Releases</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking module evolution and versioning frequency.
          </p>
        </div>
        <TooltipIcon
          content={tooltipContent.title}
          label="Terraform Registry Releases"
        />
      </div>

      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <div className="space-y-8">
          <DataFreshness referenceDate={data.meta.referenceDate} />
          <InsightsPanel insights={data.insights} />

          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              label="Modules"
              tooltip={tooltipContent.totalModules}
              value={data.stats.totalModules}
            />
            <MetricCard
              label="Major Versions"
              tooltip={tooltipContent.totalMajorVersions}
              value={data.stats.totalMajorVersions}
            />
            <MetricCard
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
                color: colors.green,
                key: "major_versions",
                name: "New Majors",
              },
            ]}
            title="Major Versions Trend (Monthly)"
            tooltip={tooltipContent.majorVersionsTrend}
            unit="new majors"
            xKey="month"
          />

          {/* Detail table */}
          <DataTable
            columns={[
              {
                key: "moduleName",
                label: "Module",
                renderCell: (value, row) => (
                  <a
                    className="text-link font-semibold hover:text-link hover:underline"
                    href={`https://registry.terraform.io/modules/pagopa-dx/${value}/${row.provider}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {String(value)}
                  </a>
                ),
              },
              { key: "provider", label: "Provider" },
              { key: "majorVersionsCount", label: "Majors" },
              { key: "latestMajor", label: "Latest" },
              { key: "totalReleases", label: "Releases" },
              { key: "firstReleaseDate", label: "First Release" },
              { key: "lastReleaseDate", label: "Last Release" },
              {
                key: "versionsDetail",
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
