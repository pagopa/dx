/** Zod schemas and inferred types for the pull-requests database adapter. */

import { z } from "zod";

import { dashboardParamsSchema, percentileRowSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const fetchPrDashboardInputSchema = dashboardParamsSchema.extend({
  /**
   * Organisation lead-time benchmark, optional so the route can omit it when
   * the benchmark query fails without failing the whole dashboard.
   */
  peerBenchmark: z
    .object({
      leadTimeMedian: nullableSqlNumberSchema,
      peerCount: sqlNumberSchema,
      percentileRank: nullableSqlNumberSchema,
    })
    .optional(),
});

export const prMetricValueRowSchema = z.object({
  value: nullableSqlNumberSchema,
});

export const prSummaryCardsSchema = z.object({
  avgLeadTime: nullableSqlNumberSchema,
  avgTimeToMerge: nullableSqlNumberSchema,
  contributors: nullableSqlNumberSchema,
  totalPrs: nullableSqlNumberSchema,
});

export const prDateCountRowSchema = z.object({
  date: sqlDateSchema,
  prCount: sqlNumberSchema,
});

export const prOpenCountRowSchema = z.object({
  date: sqlDateSchema,
  openPrs: sqlNumberSchema,
});

export const prCumulativeCountRowSchema = z.object({
  cumulativeCount: sqlNumberSchema,
  date: sqlDateSchema,
});

export const prLeadTimeMovingAvgRowSchema = z.object({
  avgLeadTimeDays: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prLeadTimeTrendRowSchema = z.object({
  date: sqlDateSchema,
  trendLine: sqlNumberSchema,
});

export const prCommentsRowSchema = z.object({
  avgComments: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prSizeRowSchema = z.object({
  avgAdditions: sqlNumberSchema,
  week: sqlDateSchema,
});

export const prSizeDistributionRowSchema = z.object({
  avgAdditions: sqlNumberSchema,
  avgLeadTimeDays: nullableSqlNumberSchema,
  prCount: sqlNumberSchema,
  sizeRange: z.string().min(1),
});

export const prsByContributorRowSchema = z.object({
  author: z.string().min(1),
  prCount: sqlNumberSchema,
});

export const slowestPrRowSchema = z.object({
  createdAt: sqlTimestampSchema,
  leadTimeDays: sqlNumberSchema,
  mergedAt: sqlTimestampSchema,
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
  prSize: z.array(prSizeRowSchema),
  prSizeDistribution: z.array(prSizeDistributionRowSchema),
  slowestPrs: z.array(slowestPrRowSchema),
});

export const prDashboardSchema = z.object({
  cards: prSummaryCardsSchema,
  cumulatedNewPrs: z.array(prCumulativeCountRowSchema),
  leadTimeMovingAvg: z.array(prLeadTimeMovingAvgRowSchema),
  leadTimePercentiles: percentileRowSchema,
  leadTimeTrend: z.array(prLeadTimeTrendRowSchema),
  mergedPrs: z.array(prDateCountRowSchema),
  newPrs: z.array(prDateCountRowSchema),
  prComments: z.array(prCommentsRowSchema),
  prSize: z.array(prSizeRowSchema),
  prSizeDistribution: z.array(prSizeDistributionRowSchema),
  prsByContributor: z.array(prsByContributorRowSchema),
  previousLeadTime: nullableSqlNumberSchema,
  slowestPrs: z.array(slowestPrRowSchema),
  unmergedPrs: z.array(prOpenCountRowSchema),
});

export type FetchPrDashboardInput = z.infer<typeof fetchPrDashboardInputSchema>;
export type PrCountData = z.infer<typeof prCountDataSchema>;
export type PrDashboardResult = z.infer<typeof prDashboardSchema>;
export type PrLeadTimeData = z.infer<typeof prLeadTimeDataSchema>;
export type PrQualityData = z.infer<typeof prQualityDataSchema>;
export type PrSummaryCards = z.infer<typeof prSummaryCardsSchema>;
