/** Zod schemas and inferred types for the pull-requests-review database adapter. */

import { z } from "zod";

import { dashboardParamsSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const getPullRequestsReviewDashboardInputSchema = dashboardParamsSchema;

export const reviewMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
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

export const pullRequestsReviewCardsSchema = z.object({
  avgTimeToFirstReview: nullableSqlNumberSchema,
  avgTimeToMerge: nullableSqlNumberSchema,
});

export const pullRequestsReviewDashboardSchema = z.object({
  cards: pullRequestsReviewCardsSchema,
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
