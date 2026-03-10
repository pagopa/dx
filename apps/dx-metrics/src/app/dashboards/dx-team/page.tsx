"use client";

import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/dashboard-request-state";
import { SimpleBarChart, DataTable } from "@/components/Charts";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";
import TooltipIcon from "@/components/TooltipIcon";
import { dxTeamTooltips as tooltipContent } from "./tooltips";

interface DxTeamData {
  ioInfraPrs: { date: string; dx_pr: number; non_dx_pr: number }[];
  dxCommits: {
    committer_date: string;
    member_name: string;
    repository_commits: number;
  }[];
  ioInfraPrTable: { author: string; created_at: string }[];
  commitsByRepo: {
    member_name: string;
    full_name: string;
    repository_commits: number;
  }[];
  dxAdoptingProjects: { repository: string }[];
  dxPipelinesUsage: { dx_path: string; repository_count: number }[];
}

export default function DxTeamDashboard() {
  const { days, setDays } = useDashboardFilters({ mode: "time-only" });

  const { data, loading, error, refetch } = useDashboardData<DxTeamData>(
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
        timeInterval={days}
        onTimeIntervalChange={setDays}
      />
      <DashboardRequestState
        loading={loading}
        error={error}
        onRetry={refetch}
      />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SimpleBarChart
              title="Pull Requests on IO-Infra"
              data={data.ioInfraPrs}
              xKey="date"
              tooltip={tooltipContent.ioInfraPrs}
              bars={[
                { key: "dx_pr", name: "DX PR", color: "#2563eb", stackId: "a" },
                {
                  key: "non_dx_pr",
                  name: "Non DX PR",
                  color: "#dc2626",
                  stackId: "a",
                },
              ]}
            />
            <SimpleBarChart
              title="DX Members Commits on Non-DX Repositories"
              data={data.dxCommits}
              xKey="committer_date"
              tooltip={tooltipContent.dxMemberCommits}
              bars={[
                {
                  key: "repository_commits",
                  name: "Commits",
                  color: "#2563eb",
                },
              ]}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              title="Pull Requests on IO-Infra"
              tooltip={tooltipContent.ioInfraPrTable}
              columns={[
                { key: "author", label: "Author" },
                { key: "created_at", label: "Created At" },
              ]}
              data={data.ioInfraPrTable}
            />
            <DataTable
              title="DX Members Commit by Repository"
              tooltip={tooltipContent.commitsByRepo}
              columns={[
                { key: "member_name", label: "Member" },
                { key: "full_name", label: "Repository" },
                { key: "repository_commits", label: "Commits" },
              ]}
              data={data.commitsByRepo}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <DataTable
              title="Projects that adopt DX tooling"
              tooltip={tooltipContent.adoptingProjects}
              columns={[
                {
                  key: "repository",
                  label: "Repository",
                  renderCell: (val) => {
                    const repository = String(val);
                    return (
                      <a
                        href={`https://github.com/${repository}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {repository}
                      </a>
                    );
                  },
                },
              ]}
              data={data.dxAdoptingProjects}
            />
            <DataTable
              title="DX Pipelines usage"
              tooltip={tooltipContent.pipelinesUsage}
              columns={[
                {
                  key: "dx_path",
                  label: "DX Path",
                  renderCell: (val) => {
                    const path = String(val);
                    const encodedPath = encodeURIComponent(`"${path}"`);
                    return (
                      <a
                        href={`https://github.com/search?q=org%3Apagopa+${encodedPath}&type=code`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {path}
                      </a>
                    );
                  },
                },
                { key: "repository_count", label: "Repositories" },
              ]}
              data={data.dxPipelinesUsage}
            />
          </div>
        </>
      )}
    </div>
  );
}
