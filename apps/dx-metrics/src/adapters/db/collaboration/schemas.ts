/** Zod schemas and inferred types for the cross-repository collaboration adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

/**
 * Input for {@link getCollaborationDashboard}. Cross-repository, so instead of
 * a single `fullName` it takes the full names of every repository to aggregate
 * (e.g. `"pagopa/dx"`).
 */
export const getCollaborationDashboardInputSchema = z.object({
  days: z.number().int().nonnegative(),
  repositories: z.array(z.string().min(1)),
});

/** Single nullable metric value, e.g. an average or a share. */
export const collaborationMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

/**
 * Reviewer-level totals collapsed into one row: the three summary figures
 * (total reviews, busiest-reviewer share, churn share) share this scan so they
 * cannot disagree on the denominator.
 */
export const collaborationReviewerShareRowSchema = z.object({
  changeRequests: sqlNumberSchema,
  churnShare: nullableSqlNumberSchema,
  dismissals: sqlNumberSchema,
  topReviewerShare: nullableSqlNumberSchema,
  totalReviews: sqlNumberSchema,
});

/** Point-in-time size of the review queue and how much of it is overdue. */
export const collaborationAwaitingSummaryRowSchema = z.object({
  awaitingReviewCount: sqlNumberSchema,
  overdueAwaitingCount: sqlNumberSchema,
});

/** Raw distribution of human reviews per PR, before bucketing into "0".."3+". */
export const collaborationReviewRoundsRowSchema = z.object({
  prCount: sqlNumberSchema,
  reviewCount: sqlNumberSchema,
});

export const collaborationReviewerLoadRowSchema = z.object({
  approvals: sqlNumberSchema,
  changeRequests: sqlNumberSchema,
  comments: sqlNumberSchema,
  dismissals: sqlNumberSchema,
  reviewer: z.string().min(1),
  totalReviews: sqlNumberSchema,
});

/**
 * Reviews split by whether the reviewer also authored the pull request.
 *
 * GitHub does not allow approving your own pull request, so "own PRs" reviews
 * are self-comments, not self-approvals.
 */
export const collaborationSelfReviewRowSchema = z.object({
  login: z.string().min(1),
  otherReviews: sqlNumberSchema,
  ownReviews: sqlNumberSchema,
});

/** Open PR still waiting for a first human approval. */
export const collaborationAwaitingReviewRowSchema = z.object({
  ageDays: sqlNumberSchema,
  author: z.string().min(1).nullable(),
  number: sqlNumberSchema,
  repository: z.string().min(1),
  reviewDecision: z.string().nullable(),
  title: z.string().min(1),
});

export const collaborationMatrixRowSchema = z.object({
  author: z.string().min(1),
  reviewCount: sqlNumberSchema,
  reviewer: z.string().min(1),
});

export const collaborationReviewTrendRowSchema = z.object({
  avgHoursToFirstReview: sqlNumberSchema,
  week: sqlDateSchema,
});

export const collaborationSummarySchema = z.object({
  avgTimeToFirstReviewHours: nullableSqlNumberSchema,
  awaitingReviewCount: sqlNumberSchema,
  churnShare: nullableSqlNumberSchema,
  medianReviewRounds: nullableSqlNumberSchema,
  overdueAwaitingCount: sqlNumberSchema,
  /** Human reviews submitted by the author on their own pull requests. */
  selfReviewCount: sqlNumberSchema,
  /** Self-reviews / (self-reviews + reviews of other people's PRs), 0..1. */
  selfReviewShare: nullableSqlNumberSchema,
  topReviewerShare: nullableSqlNumberSchema,
  totalReviews: sqlNumberSchema,
});

export const collaborationDashboardSchema = z.object({
  awaitingReview: z.array(collaborationAwaitingReviewRowSchema),
  collaborationMatrix: z.array(collaborationMatrixRowSchema),
  reviewTrend: z.array(collaborationReviewTrendRowSchema),
  reviewerBehaviour: z.array(collaborationSelfReviewRowSchema),
  reviewerLoad: z.array(collaborationReviewerLoadRowSchema),
  summary: collaborationSummarySchema,
});

export type CollaborationSummary = z.infer<typeof collaborationSummarySchema>;
export type CollaborationDashboard = z.infer<
  typeof collaborationDashboardSchema
>;
export type CollaborationAwaitingReviewRow = z.infer<
  typeof collaborationAwaitingReviewRowSchema
>;
export type CollaborationReviewerLoadRow = z.infer<
  typeof collaborationReviewerLoadRowSchema
>;
export type CollaborationReviewRoundsRow = z.infer<
  typeof collaborationReviewRoundsRowSchema
>;
export type GetCollaborationDashboardInput = z.infer<
  typeof getCollaborationDashboardInputSchema
>;
