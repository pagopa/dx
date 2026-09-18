/** Zod schemas and inferred types for the pull-requests-review database adapter. */

import { z } from "zod";

import { dashboardParamsSchema, percentileRowSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const getPullRequestsReviewDashboardInputSchema = dashboardParamsSchema;

export const reviewMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

/** The two "merged without …" shares computed on the same PR population. */
export const mergedWithoutActivityShareRowSchema = z.object({
  withoutComments: nullableSqlNumberSchema,
  withoutReview: nullableSqlNumberSchema,
});

/** Comment total and per-PR average, computed on the same PR population. */
export const commentSummaryRowSchema = z.object({
  commentsPerPr: nullableSqlNumberSchema,
  totalComments: nullableSqlNumberSchema,
});

export const reviewDistributionRowSchema = z.object({
  approvals: sqlNumberSchema,
  changeRequests: sqlNumberSchema,
  reviewer: z.string().min(1),
  totalReviews: sqlNumberSchema,
});

export const reviewMatrixRowSchema = z.object({
  author: z.string().min(1),
  reviewCount: sqlNumberSchema,
  reviewer: z.string().min(1),
});

export const timeToFirstReviewTrendRowSchema = z.object({
  avgHoursToFirstReview: sqlNumberSchema,
  week: sqlDateSchema,
});

export const timeToMergeTrendRowSchema = z.object({
  avgHoursToMerge: sqlNumberSchema,
  week: sqlDateSchema,
});

/** Same card metrics over the immediately preceding, equally-sized window. */
export const reviewPreviousValuesRowSchema = z.object({
  previousAvgTimeToFirstReview: nullableSqlNumberSchema,
  previousCommentsPerPr: nullableSqlNumberSchema,
  previousMergedWithoutCommentsPct: nullableSqlNumberSchema,
  previousTotalComments: nullableSqlNumberSchema,
});

export const pullRequestsReviewCardsSchema = z.object({
  avgTimeToFirstReview: nullableSqlNumberSchema,
  avgTimeToMerge: nullableSqlNumberSchema,
  commentsPerPr: nullableSqlNumberSchema,
  previousAvgTimeToFirstReview: nullableSqlNumberSchema,
  previousCommentsPerPr: nullableSqlNumberSchema,
  previousMergedWithoutCommentsPct: nullableSqlNumberSchema,
  previousTotalComments: nullableSqlNumberSchema,
  totalComments: nullableSqlNumberSchema,
});

export const pullRequestsReviewDashboardSchema = z.object({
  cards: pullRequestsReviewCardsSchema,
  firstReviewPercentiles: percentileRowSchema,
  mergedWithoutCommentsShare: nullableSqlNumberSchema,
  mergedWithoutReviewShare: nullableSqlNumberSchema,
  reviewDistribution: z.array(reviewDistributionRowSchema),
  reviewMatrix: z.array(reviewMatrixRowSchema),
  timeToFirstReviewTrend: z.array(timeToFirstReviewTrendRowSchema),
  timeToMergeTrend: z.array(timeToMergeTrendRowSchema),
});

export type GetPullRequestsReviewDashboardInput = z.infer<
  typeof getPullRequestsReviewDashboardInputSchema
>;
export type PullRequestsReviewDashboard = z.infer<
  typeof pullRequestsReviewDashboardSchema
>;
export type ReviewDistributionRow = z.infer<typeof reviewDistributionRowSchema>;
export type ReviewMatrixRow = z.infer<typeof reviewMatrixRowSchema>;
export type TimeToFirstReviewTrendRow = z.infer<
  typeof timeToFirstReviewTrendRowSchema
>;
export type TimeToMergeTrendRow = z.infer<typeof timeToMergeTrendRowSchema>;
