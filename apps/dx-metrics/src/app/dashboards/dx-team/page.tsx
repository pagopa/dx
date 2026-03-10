"use client";

import { DataTable, SimpleBarChart } from "@/components/Charts";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { DashboardFilters } from "@/components/DashboardFilters";
import TooltipIcon from "@/components/TooltipIcon";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { dxTeamTooltips as tooltipContent } from "./tooltips";

interface DxTeamData {
  commitsByRepo: {
    full_name: string;
    member_name: string;
    repository_commits: number;
  }[];
  dxAdoptingProjects: { repository: string }[];
  dxCommits: {
    committer_date: string;
    member_name: string;
    repository_commits: number;
  }[];
  dxPipelinesUsage: { dx_path: string; repository_count: number }[];
  ioInfraPrs: { date: string; dx_pr: number; non_dx_pr: number }[];
  ioInfraPrTable: { author: string; created_at: string }[];
}

export default function DxTeamDashboard() {
  const { days, setDays } = useDashboardFilters({ mode: "time-only" });

  const { data, error, loading, refetch } = useDashboardData<DxTeamData>(
    "dx-team",
    { days },
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Team DX Metrics</h2>
        <TooltipIcon content={tooltipContent.title} />
      </div>
      <DashboardFilters
        mode="time-only"
        onTimeIntervalChange={setDays}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SimpleBarChart
              bars={[
                { color: "#2563eb", key: "dx_pr", name: "DX PR", stackId: "a" },
                {
                  color: "#dc2626",
                  key: "non_dx_pr",
                  name: "Non DX PR",
                  stackId: "a",
                },
              ]}
              data={data.ioInfraPrs}
              title="Pull Requests on IO-Infra"
              tooltip={tooltipContent.ioInfraPrs}
              xKey="date"
            />
            <SimpleBarChart
              bars={[
                {
                  color: "#2563eb",
                  key: "repository_commits",
                  name: "Commits",
                },
              ]}
              data={data.dxCommits}
              title="DX Members Commits on Non-DX Repositories"
              tooltip={tooltipContent.dxMemberCommits}
              xKey="committer_date"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              columns={[
                { key: "author", label: "Author" },
                { key: "created_at", label: "Created At" },
              ]}
              data={data.ioInfraPrTable}
              title="Pull Requests on IO-Infra"
              tooltip={tooltipContent.ioInfraPrTable}
            />
            <DataTable
              columns={[
                { key: "member_name", label: "Member" },
                { key: "full_name", label: "Repository" },
                { key: "repository_commits", label: "Commits" },
              ]}
              data={data.commitsByRepo}
              title="DX Members Commit by Repository"
              tooltip={tooltipContent.commitsByRepo}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              columns={[
                {
                  key: "repository",
                  label: "Repository",
                  renderCell: (val) => {
                    const repository = String(val);
                    return (
                      <a
                        className="text-blue-600 hover:underline"
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
                  key: "dx_path",
                  label: "DX Path",
                  renderCell: (val) => {
                    const path = String(val);
                    const encodedPath = encodeURIComponent(`"${path}"`);
                    return (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`https://github.com/search?q=org%3Apagopa+${encodedPath}&type=code`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {path}
                      </a>
                    );
                  },
                },
                { key: "repository_count", label: "Repositories" },
              ]}
              data={data.dxPipelinesUsage}
              title="DX Pipelines usage"
              tooltip={tooltipContent.pipelinesUsage}
            />
          </div>
        </>
      )}
    </div>
  );
}
