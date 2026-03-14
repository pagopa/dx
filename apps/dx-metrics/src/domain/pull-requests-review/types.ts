/** Zod schemas and inferred types for the pull-requests-review dashboard result. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const reviewMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

export const reviewDistributionRowSchema = z.object({
  approvals: sqlNumberSchema,
  change_requests: sqlNumberSchema,
  reviewer: z.string().min(1),
  total_reviews: sqlNumberSchema,
});

export const reviewMatrixRowSchema = z.object({
  author: z.string().min(1),
  review_count: sqlNumberSchema,
  reviewer: z.string().min(1),
});

export const timeToFirstReviewTrendRowSchema = z.object({
  avg_hours_to_first_review: sqlNumberSchema,
  week: sqlDateSchema,
});

export const timeToMergeTrendRowSchema = z.object({
  avg_hours_to_merge: sqlNumberSchema,
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

export type PullRequestsReviewDashboard = z.infer<
  typeof pullRequestsReviewDashboardSchema
>;
export type ReviewDistributionRow = z.infer<typeof reviewDistributionRowSchema>;
export type ReviewMatrixRow = z.infer<typeof reviewMatrixRowSchema>;
export type TimeToFirstReviewTrendRow = z.infer<
  typeof timeToFirstReviewTrendRowSchema
>;
export type TimeToMergeTrendRow = z.infer<typeof timeToMergeTrendRowSchema>;
