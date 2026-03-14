/** Types for the Terraform registry releases dashboard. */

export interface ModuleSummaryRow {
  readonly first_release_date: null | string;
  readonly last_release_date: null | string;
  readonly latest_major: number;
  readonly major_versions_count: number;
  readonly module_name: string;
  readonly provider: string;
  readonly total_releases: number;
  readonly versions_detail: string;
}

export interface ReleasesDashboard {
  readonly modulesSummary: readonly ModuleSummaryRow[];
  readonly releasesTimeline: readonly ReleasesTimelineRow[];
  readonly stats: ReleaseStats;
}

export interface ReleaseStats {
  readonly newestRelease: null | string;
  readonly oldestRelease: null | string;
  readonly totalMajorVersions: number;
  readonly totalModules: number;
  readonly totalReleases: number;
}

export interface ReleasesTimelineRow {
  readonly major_versions_introduced: number;
  readonly month: string;
  readonly total_releases: number;
}
