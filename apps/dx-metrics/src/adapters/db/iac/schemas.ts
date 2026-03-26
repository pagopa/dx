/** Zod schemas and inferred types for the IaC dashboard database adapter. */

import { z } from "zod";

import { dashboardParamsSchema } from "../shared/schemas";
import {
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const getIacDashboardInputSchema = dashboardParamsSchema;

export const maxDateRowSchema = z.object({
  maxDate: sqlTimestampSchema,
});

export const dxMemberRowSchema = z.object({
  username: z.string().min(1),
});

export const leadTimeMovingAvgRowSchema = z.object({
  avgLeadTimeDays: sqlNumberSchema,
  week: sqlDateSchema,
});

export const leadTimeTrendRowSchema = z.object({
  date: sqlDateSchema,
  trendLine: sqlNumberSchema,
});

export const prsByReviewerRowSchema = z.object({
  avgLeadTimeDays: sqlNumberSchema,
  mergedPrs: sqlNumberSchema,
  reviewer: z.string().min(1),
  totalPrs: sqlNumberSchema,
});

export const prsOverTimeRowSchema = z.object({
  prCount: sqlNumberSchema,
  week: sqlDateSchema,
});

export const supervisedVsUnsupervisedRowSchema = z.object({
  cumulativeCount: sqlNumberSchema,
  prType: z.string().min(1),
  runDate: sqlDateSchema,
});

export const iacDashboardResultSchema = z.object({
  leadTimeMovingAvg: z.array(leadTimeMovingAvgRowSchema),
  leadTimeTrend: z.array(leadTimeTrendRowSchema),
  prsByReviewer: z.array(prsByReviewerRowSchema),
  prsOverTime: z.array(prsOverTimeRowSchema),
  supervisedVsUnsupervised: z.array(supervisedVsUnsupervisedRowSchema),
});

export type GetIacDashboardInput = z.infer<typeof getIacDashboardInputSchema>;
export type IacDashboardResult = z.infer<typeof iacDashboardResultSchema>;
export type LeadTimeMovingAvgRow = z.infer<typeof leadTimeMovingAvgRowSchema>;
export type LeadTimeTrendRow = z.infer<typeof leadTimeTrendRowSchema>;
export type PrsByReviewerRow = z.infer<typeof prsByReviewerRowSchema>;
export type PrsOverTimeRow = z.infer<typeof prsOverTimeRowSchema>;
export type SupervisedVsUnsupervisedRow = z.infer<
  typeof supervisedVsUnsupervisedRowSchema
>;
