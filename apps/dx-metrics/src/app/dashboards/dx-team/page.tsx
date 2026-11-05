"use client";

import { DataTable, SimpleBarChart } from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import { InsightsPanel } from "@/components/InsightsPanel";
import TooltipIcon from "@/components/TooltipIcon";
import { useSeriesColors } from "@/lib/chart-theme";
import { ORGANIZATION } from "@/lib/config";
import type { DashboardMetaView } from "@/lib/dashboard-meta";
import type { Insight } from "@/lib/insights/types";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { dxTeamTooltips as tooltipContent } from "./tooltips";

/**
 * GitHub code-search URL for a module group.
 *
 * The short name shown in the table is a display artefact; searching for it
 * would match unrelated text. The link therefore searches one raw source
 * expression, still unnormalised, quoted so punctuation is kept together.
 *
 * GitHub does not combine several quoted expressions with `OR` reliably — an
 * `OR` query returns no results — so when a module was referenced in several
 * ways we search the most-used expression instead.
 */
const moduleSearchUrl = (source: string): string =>
  `https://github.com/search?q=${encodeURIComponent(`org:${ORGANIZATION} "${source}"`)}&type=code`;

interface DxTeamData {
  commitsByRepo: {
    fullName: string;
    memberName: string;
    repositoryCommits: number;
  }[];
  dxAdoptingProjects: { repository: string }[];
  dxCommits: {
    committerDate: string;
    memberName: string;
    repositoryCommits: number;
  }[];
  dxPipelinesUsage: { dxPath: string; repositoryCount: number }[];
  ioInfraPrs: { date: string; dxPr: number; nonDxPr: number }[];
  ioInfraPrTable: { author: string; createdAt: string }[];
  /** Per-module Terraform usage across every imported repository. */
  terraformModules: {
    module: string;
    moduleType: "DX" | "Non-DX";
    repositoryCount: number;
    /** Non-normalised sources, used for the GitHub search link. */
    sources: string[];
    usageCount: number;
  }[];
  insights: Insight[];
  meta: DashboardMetaView;
}

export default function DxTeamDashboard() {
  const colors = useSeriesColors();
  const { days, end, setRange, start, timeParams } = useDashboardFilters({
    mode: "time-only",
  });

  const { data, error, loading, refetch } = useDashboardData<DxTeamData>(
    "dx-team",
    timeParams,
  );

  const dxModuleRows =
    data?.terraformModules.filter((row) => row.moduleType === "DX") ?? [];
  const nonDxModuleRows =
    data?.terraformModules.filter((row) => row.moduleType === "Non-DX") ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">Team DX Metrics</h2>
        <TooltipIcon content={tooltipContent.title} label="Team DX Metrics" />
      </div>
      <DashboardFilters
        availableFrom={data?.meta.availableFrom}
        availableTo={data?.meta.availableTo}
        mode="time-only"
        onRangeChange={setRange}
        rangeEnd={data?.meta.windowEnd ?? end}
        rangeStart={data?.meta.windowStart ?? start}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <DataFreshness
            className="mb-2"
            availableFrom={data.meta.availableFrom}
            availableTo={data.meta.availableTo}
            referenceDate={data.meta.referenceDate}
            windowEnd={data.meta.windowEnd}
            windowStart={data.meta.windowStart}
          />
          <InsightsPanel
            className="mb-4"
            insights={data.insights}
            periodDays={data?.meta.days ?? days}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SimpleBarChart
              bars={[
                {
                  color: colors.blue,
                  key: "dxPr",
                  name: "DX PR",
                  stackId: "a",
                },
                {
                  color: colors.red,
                  key: "nonDxPr",
                  name: "Non DX PR",
                  stackId: "a",
                },
              ]}
              data={data.ioInfraPrs}
              title="Pull Requests on IO-Infra"
              tooltip={tooltipContent.ioInfraPrs}
              tooltipFormatter={(value) => value.toFixed(0)}
              unit="PRs"
              xKey="date"
            />
            <SimpleBarChart
              bars={[
                {
                  color: colors.blue,
                  key: "repositoryCommits",
                  name: "Commits",
                },
              ]}
              data={data.dxCommits}
              title="DX Members Commits on Non-DX Repositories"
              tooltip={tooltipContent.dxMemberCommits}
              unit="commits"
              xKey="committerDate"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DataTable
              columns={[
                { key: "author", label: "Author" },
                { key: "createdAt", label: "Created At" },
              ]}
              data={data.ioInfraPrTable}
              title="Pull Requests on IO-Infra"
              tooltip={tooltipContent.ioInfraPrTable}
            />
            <DataTable
              columns={[
                { key: "memberName", label: "Member" },
                { key: "fullName", label: "Repository" },
                { key: "repositoryCommits", label: "Commits" },
              ]}
              data={data.commitsByRepo}
              title="DX Members Commit by Repository"
              tooltip={tooltipContent.commitsByRepo}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DataTable
              columns={[
                {
                  key: "repository",
                  label: "Repository",
                  renderCell: (val) => {
                    const repository = String(val);
                    return (
                      <a
                        className="text-link hover:underline"
                        href={`https://github.com/${repository}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {repository}
                      </a>
                    );
                  },
                },
              ]}
              data={data.dxAdoptingProjects}
              title="Projects that adopt DX tooling"
              tooltip={tooltipContent.adoptingProjects}
            />
            <DataTable
              columns={[
                {
                  key: "dxPath",
                  label: "DX Path",
                  renderCell: (val) => {
                    const path = String(val);
                    const encodedPath = encodeURIComponent(`"${path}"`);
                    return (
                      <a
                        className="text-link hover:underline"
                        href={`https://github.com/search?q=org%3A${encodeURIComponent(ORGANIZATION)}+${encodedPath}&type=code`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {path}
                      </a>
                    );
                  },
                },
                { key: "repositoryCount", label: "Repositories" },
              ]}
              data={data.dxPipelinesUsage}
              title="DX Pipelines usage"
              tooltip={tooltipContent.pipelinesUsage}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <DataTable
              columns={[
                {
                  key: "module",
                  label: "Module",
                  renderCell: (value, row) => (
                    <a
                      className="text-link hover:underline"
                      href={moduleSearchUrl(row.sources[0] ?? String(value))}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {String(value)}
                    </a>
                  ),
                },
                { key: "repositoryCount", label: "Repositories" },
                { key: "usageCount", label: "Occurrences" },
              ]}
              data={dxModuleRows}
              title="DX Terraform Modules — usage per module"
              tooltip={tooltipContent.dxModules}
            />
            <DataTable
              columns={[
                {
                  key: "module",
                  label: "Module",
                  renderCell: (value, row) => (
                    <a
                      className="text-link hover:underline"
                      href={moduleSearchUrl(row.sources[0] ?? String(value))}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {String(value)}
                    </a>
                  ),
                },
                { key: "repositoryCount", label: "Repositories" },
                { key: "usageCount", label: "Occurrences" },
              ]}
              data={nonDxModuleRows}
              title="Non-DX Terraform Modules — usage per module"
              tooltip={tooltipContent.nonDxModules}
            />
          </div>
          <p className="mt-2 text-xs text-subtle-foreground">
            Snapshot of every imported repository, local modules excluded.
            Module names are normalised to the registry module name or
            repository name before grouping. Clicking a module searches GitHub
            for its original, non-normalised source expression (the most-used
            one when the module was referenced in several ways). Occurrences
            count module declarations (repository + file); Repositories counts
            distinct repositories. Neither is affected by the date range.
          </p>
        </>
      )}
    </div>
  );
}
