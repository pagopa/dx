/** Zod schemas and inferred types for the workflows database adapter. */

import { z } from "zod";

import { dashboardParamsSchema } from "../shared/schemas";
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

export const workflowInfraDurationSchema = z.object({
  durationMinutes: sqlNumberSchema,
  runTimestamp: sqlTimestampSchema,
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
  firstPipelineDate: nullableSqlTimestampSchema,
  totalDurationMinutes: nullableSqlNumberSchema,
  totalPipelines: sqlNumberSchema,
});

export const workflowDashboardSchema = z.object({
  avgDuration: z.array(workflowAvgDurationSchema),
  cumulativeDuration: z.array(workflowCumulativeDurationSchema),
  deployments: z.array(workflowDeploymentSchema),
  dxVsNonDx: z.array(workflowDxVsNonDxSchema),
  failures: z.array(workflowFailureSchema),
  infraApply: z.array(workflowInfraDurationSchema),
  infraPlan: z.array(workflowInfraDurationSchema),
  runCount: z.array(workflowRunCountSchema),
  successRatio: z.array(workflowSuccessRatioSchema),
  summary: workflowSummarySchema.optional(),
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
export type WorkflowDxVsNonDx = z.infer<typeof workflowDxVsNonDxSchema>;
export type WorkflowFailure = z.infer<typeof workflowFailureSchema>;
export type WorkflowInfraDuration = z.infer<typeof workflowInfraDurationSchema>;
export type WorkflowRunCount = z.infer<typeof workflowRunCountSchema>;
export type WorkflowSuccessRatio = z.infer<typeof workflowSuccessRatioSchema>;
export type WorkflowSummary = z.infer<typeof workflowSummarySchema>;
