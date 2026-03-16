/** Zod schemas and inferred types for the pull-requests database adapter. */

import { z } from "zod";

import { dashboardParamsSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const fetchPrDashboardInputSchema = dashboardParamsSchema;

export const prMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

export const prSummaryCardsSchema = z.object({
  avgLeadTime: nullableSqlNumberSchema,
  commentsPerPr: nullableSqlNumberSchema,
  totalComments: nullableSqlNumberSchema,
  totalPrs: nullableSqlNumberSchema,
});

export const prDateCountRowSchema = z.object({
  date: sqlDateSchema,
  pr_count: sqlNumberSchema,
});

export const prOpenCountRowSchema = z.object({
  date: sqlDateSchema,
  open_prs: sqlNumberSchema,
});

export const prCumulativeCountRowSchema = z.object({
  cumulative_count: sqlNumberSchema,
  date: sqlDateSchema,
});

export const prLeadTimeMovingAvgRowSchema = z.object({
  avg_lead_time_days: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prLeadTimeTrendRowSchema = z.object({
  date: sqlDateSchema,
  trend_line: sqlNumberSchema,
});

export const prCommentsRowSchema = z.object({
  avg_comments: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prCommentsBySizeRowSchema = z.object({
  avg_comments_per_addition: nullableSqlNumberSchema,
  week: sqlDateSchema,
});

export const prSizeRowSchema = z.object({
  avg_additions: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prSizeDistributionRowSchema = z.object({
  avg_additions: sqlNumberSchema,
  pr_count: sqlNumberSchema,
  size_range: z.string().min(1),
});

export const slowestPrRowSchema = z.object({
  created_at: sqlTimestampSchema,
  lead_time_days: sqlNumberSchema,
  merged_at: sqlTimestampSchema,
  number: sqlNumberSchema,
  title: z.string().min(1),
});

export const prCountDataSchema = z.object({
  cumulatedNewPrs: z.array(prCumulativeCountRowSchema),
  mergedPrs: z.array(prDateCountRowSchema),
  newPrs: z.array(prDateCountRowSchema),
  unmergedPrs: z.array(prOpenCountRowSchema),
});

export const prLeadTimeDataSchema = z.object({
  leadTimeMovingAvg: z.array(prLeadTimeMovingAvgRowSchema),
  leadTimeTrend: z.array(prLeadTimeTrendRowSchema),
});

export const prQualityDataSchema = z.object({
  prComments: z.array(prCommentsRowSchema),
  prCommentsBySize: z.array(prCommentsBySizeRowSchema),
  prSize: z.array(prSizeRowSchema),
  prSizeDistribution: z.array(prSizeDistributionRowSchema),
  slowestPrs: z.array(slowestPrRowSchema),
});

export const prDashboardSchema = z.object({
  cards: prSummaryCardsSchema,
  cumulatedNewPrs: z.array(prCumulativeCountRowSchema),
  leadTimeMovingAvg: z.array(prLeadTimeMovingAvgRowSchema),
  leadTimeTrend: z.array(prLeadTimeTrendRowSchema),
  mergedPrs: z.array(prDateCountRowSchema),
  newPrs: z.array(prDateCountRowSchema),
  prComments: z.array(prCommentsRowSchema),
  prCommentsBySize: z.array(prCommentsBySizeRowSchema),
  prSize: z.array(prSizeRowSchema),
  prSizeDistribution: z.array(prSizeDistributionRowSchema),
  slowestPrs: z.array(slowestPrRowSchema),
  unmergedPrs: z.array(prOpenCountRowSchema),
});

export type FetchPrDashboardInput = z.infer<typeof fetchPrDashboardInputSchema>;
export type PrCountData = z.infer<typeof prCountDataSchema>;
export type PrDashboardResult = z.infer<typeof prDashboardSchema>;
export type PrLeadTimeData = z.infer<typeof prLeadTimeDataSchema>;
export type PrQualityData = z.infer<typeof prQualityDataSchema>;
export type PrSummaryCards = z.infer<typeof prSummaryCardsSchema>;
