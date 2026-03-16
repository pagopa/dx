/** Zod schemas and inferred types for the releases database adapter. */

import { z } from "zod";

import {
  nullableSqlDateSchema,
  sqlMonthSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const releaseStatsRowSchema = z.object({
  newestRelease: nullableSqlDateSchema,
  oldestRelease: nullableSqlDateSchema,
  totalMajorVersions: sqlNumberSchema,
  totalModules: sqlNumberSchema,
  totalReleases: sqlNumberSchema,
});

export const moduleSummaryRowSchema = z.object({
  firstReleaseDate: nullableSqlDateSchema,
  lastReleaseDate: nullableSqlDateSchema,
  latestMajor: sqlNumberSchema,
  majorVersionsCount: sqlNumberSchema,
  moduleName: z.string().min(1),
  provider: z.string().min(1),
  totalReleases: sqlNumberSchema,
  versionsDetail: z.string(),
});

export const releaseStatsSchema = z.object({
  newestRelease: nullableSqlDateSchema,
  oldestRelease: nullableSqlDateSchema,
  totalMajorVersions: sqlNumberSchema,
  totalModules: sqlNumberSchema,
  totalReleases: sqlNumberSchema,
});

export const releasesTimelineRowSchema = z.object({
  majorVersionsIntroduced: sqlNumberSchema,
  month: sqlMonthSchema,
  totalReleases: sqlNumberSchema,
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
