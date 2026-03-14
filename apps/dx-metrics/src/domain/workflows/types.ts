/** Zod schemas and inferred types for the workflows dashboard. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  nullableSqlTimestampSchema,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const maxDateRowSchema = z.object({
  max_date: sqlTimestampSchema,
});

export const workflowAvgDurationSchema = z.object({
  average_duration_minutes: sqlNumberSchema,
  workflow_name: z.string().min(1),
});

export const workflowCumulativeDurationSchema = z.object({
  cumulative_duration_minutes: sqlNumberSchema,
  workflow_name: z.string().min(1),
});

export const workflowDeploymentSchema = z.object({
  run_week: sqlTimestampSchema,
  weekly_deployment_count: sqlNumberSchema,
});

export const workflowDxVsNonDxSchema = z.object({
  cumulative_count: sqlNumberSchema,
  pipeline_type: z.string().min(1),
  run_date: sqlDateSchema,
});

export const workflowFailureSchema = z.object({
  failed_runs: sqlNumberSchema,
  workflow_name: z.string().min(1),
});

export const workflowInfraDurationSchema = z.object({
  duration_minutes: sqlNumberSchema,
  run_timestamp: sqlTimestampSchema,
});

export const workflowRunCountSchema = z.object({
  run_count: sqlNumberSchema,
  workflow_name: z.string().min(1),
});

export const workflowSuccessRatioSchema = z.object({
  failed_runs: sqlNumberSchema,
  success_rate_percentage: sqlNumberSchema,
  successful_runs: sqlNumberSchema,
  total_runs: sqlNumberSchema,
  workflow_name: z.string().min(1),
});

export const workflowSummarySchema = z.object({
  avg_duration_minutes: nullableSqlNumberSchema,
  first_pipeline_date: nullableSqlTimestampSchema,
  total_duration_minutes: nullableSqlNumberSchema,
  total_pipelines: sqlNumberSchema,
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
