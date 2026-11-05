/** Zod schemas and inferred types for the workflows database adapter. */

import { z } from "zod";

import { dashboardParamsSchema, percentileRowSchema } from "../shared/schemas";
import {
  nullableSqlNumberSchema,
  nullableSqlTimestampSchema,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const getWorkflowDashboardInputSchema = dashboardParamsSchema;

export const maxDateRowSchema = z.object({
  maxDate: sqlTimestampSchema,
});

export const workflowAvgDurationSchema = z.object({
  averageDurationMinutes: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowCumulativeDurationSchema = z.object({
  cumulativeDurationMinutes: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowDeploymentSchema = z.object({
  runWeek: sqlTimestampSchema,
  weeklyDeploymentCount: sqlNumberSchema,
});

export const workflowDxVsNonDxSchema = z.object({
  cumulativeCount: sqlNumberSchema,
  pipelineType: z.string().min(1),
  runDate: sqlDateSchema,
});

export const workflowFailureSchema = z.object({
  failedRuns: sqlNumberSchema,
  workflowName: z.string().min(1),
});

/** One bucket of the top-2 slowest pipelines' average duration trend. */
export const workflowDurationTrendSchema = z.object({
  averageDurationMinutes: sqlNumberSchema,
  bucket: sqlDateSchema,
  workflowName: z.string().min(1),
});

/** One bucket of the top-2 most failing pipelines' failure trend. */
export const workflowFailureTrendSchema = z.object({
  bucket: sqlDateSchema,
  failedRuns: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowRunCountSchema = z.object({
  runCount: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowSuccessRatioSchema = z.object({
  failedRuns: sqlNumberSchema,
  successfulRuns: sqlNumberSchema,
  successRatePercentage: sqlNumberSchema,
  totalRuns: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowSummarySchema = z.object({
  avgDurationMinutes: nullableSqlNumberSchema,
  failedDurationMinutes: nullableSqlNumberSchema,
  firstPipelineDate: nullableSqlTimestampSchema,
  /** Same card metrics over the immediately preceding, equally-sized window. */
  previousAvgDurationMinutes: nullableSqlNumberSchema,
  previousFailedDurationMinutes: nullableSqlNumberSchema,
  previousTotalDurationMinutes: nullableSqlNumberSchema,
  previousTotalPipelines: nullableSqlNumberSchema,
  totalDurationMinutes: nullableSqlNumberSchema,
  totalPipelines: sqlNumberSchema,
});

export const workflowSuccessRateStatsSchema = z.object({
  current: nullableSqlNumberSchema,
  previous: nullableSqlNumberSchema,
});

export const workflowTriggerTypeSchema = z.object({
  runCount: sqlNumberSchema,
  triggerType: z.string().min(1),
});

export const workflowTriggerBreakdownSchema = z.object({
  automatic: sqlNumberSchema,
  manual: sqlNumberSchema,
  unknown: sqlNumberSchema,
  workflowName: z.string().min(1),
});

export const workflowDashboardSchema = z.object({
  avgDuration: z.array(workflowAvgDurationSchema),
  cumulativeDuration: z.array(workflowCumulativeDurationSchema),
  deployments: z.array(workflowDeploymentSchema),
  durationPercentiles: percentileRowSchema,
  dxVsNonDx: z.array(workflowDxVsNonDxSchema),
  failures: z.array(workflowFailureSchema),
  runCount: z.array(workflowRunCountSchema),
  successRatio: z.array(workflowSuccessRatioSchema),
  successRateStats: workflowSuccessRateStatsSchema,
  summary: workflowSummarySchema.optional(),
  topFailureTrend: z.array(workflowFailureTrendSchema),
  topSlowestDurationTrend: z.array(workflowDurationTrendSchema),
  triggerBreakdown: z.array(workflowTriggerBreakdownSchema),
  triggerTypes: z.array(workflowTriggerTypeSchema),
});

export type GetWorkflowDashboardInput = z.infer<
  typeof getWorkflowDashboardInputSchema
>;
export type WorkflowAvgDuration = z.infer<typeof workflowAvgDurationSchema>;
export type WorkflowCumulativeDuration = z.infer<
  typeof workflowCumulativeDurationSchema
>;
export type WorkflowDashboardResult = z.infer<typeof workflowDashboardSchema>;
export type WorkflowDeployment = z.infer<typeof workflowDeploymentSchema>;
export type WorkflowDurationTrend = z.infer<typeof workflowDurationTrendSchema>;
export type WorkflowDxVsNonDx = z.infer<typeof workflowDxVsNonDxSchema>;
export type WorkflowFailure = z.infer<typeof workflowFailureSchema>;
export type WorkflowFailureTrend = z.infer<typeof workflowFailureTrendSchema>;
export type WorkflowRunCount = z.infer<typeof workflowRunCountSchema>;
export type WorkflowSuccessRatio = z.infer<typeof workflowSuccessRatioSchema>;
export type WorkflowSummary = z.infer<typeof workflowSummarySchema>;
export type WorkflowTriggerType = z.infer<typeof workflowTriggerTypeSchema>;
