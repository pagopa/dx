/** Zod schemas and inferred types for the releases database adapter. */

import { z } from "zod";

import {
  nullableSqlDateSchema,
  sqlMonthSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const releaseStatsRowSchema = z.object({
  newest_release: nullableSqlDateSchema,
  oldest_release: nullableSqlDateSchema,
  total_major_versions: sqlNumberSchema,
  total_modules: sqlNumberSchema,
  total_releases: sqlNumberSchema,
});

export const moduleSummaryRowSchema = z.object({
  first_release_date: nullableSqlDateSchema,
  last_release_date: nullableSqlDateSchema,
  latest_major: sqlNumberSchema,
  major_versions_count: sqlNumberSchema,
  module_name: z.string().min(1),
  provider: z.string().min(1),
  total_releases: sqlNumberSchema,
  versions_detail: z.string(),
});

export const releaseStatsSchema = z.object({
  newestRelease: nullableSqlDateSchema,
  oldestRelease: nullableSqlDateSchema,
  totalMajorVersions: sqlNumberSchema,
  totalModules: sqlNumberSchema,
  totalReleases: sqlNumberSchema,
});

export const releasesTimelineRowSchema = z.object({
  major_versions_introduced: sqlNumberSchema,
  month: sqlMonthSchema,
  total_releases: sqlNumberSchema,
});

export const releasesDashboardSchema = z.object({
  modulesSummary: z.array(moduleSummaryRowSchema),
  releasesTimeline: z.array(releasesTimelineRowSchema),
  stats: releaseStatsSchema,
});

export type ModuleSummaryRow = z.infer<typeof moduleSummaryRowSchema>;
export type ReleasesDashboard = z.infer<typeof releasesDashboardSchema>;
export type ReleaseStats = z.infer<typeof releaseStatsSchema>;
export type ReleasesTimelineRow = z.infer<typeof releasesTimelineRowSchema>;
