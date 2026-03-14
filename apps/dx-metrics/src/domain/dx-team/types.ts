/** Types for the DX Team dashboard result. */

export interface CommitsByRepoRow {
  readonly full_name: string;
  readonly member_name: string;
  readonly repository_commits: number;
}

export interface DxAdoptingProjectRow {
  readonly repository: string;
}

export interface DxCommitRow {
  readonly committer_date: string;
  readonly member_name: string;
  readonly repository_commits: number;
}

export interface DxPipelinesUsageRow {
  readonly dx_path: string;
  readonly repository_count: number;
}

export interface DxTeamDashboardParams {
  readonly days: number;
  readonly organization: string;
}

export interface DxTeamDashboardResult {
  readonly commitsByRepo: readonly Record<string, unknown>[];
  readonly dxAdoptingProjects: readonly Record<string, unknown>[];
  readonly dxCommits: readonly Record<string, unknown>[];
  readonly dxPipelinesUsage: readonly Record<string, unknown>[];
  readonly ioInfraPrs: readonly Record<string, unknown>[];
  readonly ioInfraPrTable: readonly Record<string, unknown>[];
}

export interface IoInfraPrRow {
  readonly date: string;
  readonly dx_pr: number;
  readonly non_dx_pr: number;
}

export interface IoInfraPrTableRow {
  readonly author: string;
  readonly created_at: string;
}
