/** Zod schemas and inferred types for the Copilot database adapter. */

import { z } from "zod";

import { dashboardParamsSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  nullableSqlTimestampSchema,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const getCopilotDashboardInputSchema = dashboardParamsSchema;

/** Headline figures, plus the same metrics over the preceding window. */
export const copilotCardsSchema = z.object({
  /** Average hours from open to merge, on merged PRs with a Copilot review. */
  avgLeadTimeHoursWith: nullableSqlNumberSchema,
  /** Average hours from open to merge, on merged PRs without one. */
  avgLeadTimeHoursWithout: nullableSqlNumberSchema,
  /** Pull requests opened in the window by the Copilot coding agent. */
  copilotAuthoredMergedPrs: sqlNumberSchema,
  copilotAuthoredPrs: sqlNumberSchema,
  /** Commits in the window carrying a `Co-authored-by: Copilot` trailer. */
  copilotCoauthoredCommits: sqlNumberSchema,
  /** Merged pull requests in the window with at least one Copilot review. */
  copilotReviewedPrs: sqlNumberSchema,
  /** Share (0..1) of imported team commits carrying the Copilot trailer. */
  coauthoredCommitShare: nullableSqlNumberSchema,
  /** Share (0..1) of merged pull requests carrying a Copilot review. */
  coverageShare: nullableSqlNumberSchema,
  mergedPrs: sqlNumberSchema,
  previousCopilotAuthoredPrs: nullableSqlNumberSchema,
  previousCopilotCoauthoredCommits: nullableSqlNumberSchema,
  previousCopilotReviewedPrs: nullableSqlNumberSchema,
  previousCoverageShare: nullableSqlNumberSchema,
  previousLeadTimeHoursWith: nullableSqlNumberSchema,
  /** Imported commits in the window, the denominator of the share above. */
  totalTeamCommits: sqlNumberSchema,
});

/**
 * Merged pull requests by who reviewed them, so the dashboard can tell whether
 * Copilot adds a second opinion or replaces a human one.
 */
export const copilotReviewCombinationSchema = z.object({
  copilotAndHuman: sqlNumberSchema,
  copilotOnly: sqlNumberSchema,
  humanOnly: sqlNumberSchema,
  noReview: sqlNumberSchema,
});

/** Copilot review adoption by pull-request size (lines added). */
export const copilotPrSizeRowSchema = z.object({
  bucket: z.string().min(1),
  copilotReviewedPrs: sqlNumberSchema,
  mergedPrs: sqlNumberSchema,
  /** Percentage (0..100) of the bucket's merged PRs that got a Copilot review. */
  reviewRate: sqlNumberSchema,
});

/** Copilot co-authored commits and average PR lead time, per week. */
export const copilotCoauthorLeadTimeRowSchema = z.object({
  avgLeadTimeDays: nullableSqlNumberSchema,
  coauthoredCommits: sqlNumberSchema,
  week: sqlDateSchema,
});

/** Copilot co-authored commit volume per repository. */
export const copilotCommitRepoRowSchema = z.object({
  commits: sqlNumberSchema,
  repository: z.string().min(1),
});

/** Cumulative merged pull requests by Copilot review coverage, per week. */
export const copilotCoverageTrendRowSchema = z.object({
  cumulativeWith: sqlNumberSchema,
  cumulativeWithout: sqlNumberSchema,
  week: sqlDateSchema,
});

/** Weekly Copilot review activity. */
export const copilotWeeklyTrendRowSchema = z.object({
  reviewedPrs: sqlNumberSchema,
  reviews: sqlNumberSchema,
  week: sqlDateSchema,
});

/** One pull request opened by the Copilot coding agent. */
export const copilotAuthoredPrRowSchema = z.object({
  createdAt: sqlTimestampSchema,
  leadTimeDays: nullableSqlNumberSchema,
  mergedAt: nullableSqlTimestampSchema,
  number: sqlNumberSchema,
  repository: z.string().min(1),
  title: z.string(),
});

export const copilotDashboardSchema = z.object({
  cards: copilotCardsSchema,
  coauthorLeadTimeTrend: z.array(copilotCoauthorLeadTimeRowSchema),
  commitsByRepository: z.array(copilotCommitRepoRowSchema),
  coverageTrend: z.array(copilotCoverageTrendRowSchema),
  prSizeBuckets: z.array(copilotPrSizeRowSchema),
  recentAuthoredPrs: z.array(copilotAuthoredPrRowSchema),
  reviewCombination: copilotReviewCombinationSchema,
  weeklyTrend: z.array(copilotWeeklyTrendRowSchema),
});

export type GetCopilotDashboardInput = z.infer<
  typeof getCopilotDashboardInputSchema
>;
export type CopilotDashboard = z.infer<typeof copilotDashboardSchema>;
export type CopilotAuthoredPrRow = z.infer<typeof copilotAuthoredPrRowSchema>;
