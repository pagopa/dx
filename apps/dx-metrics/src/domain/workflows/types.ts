/** Type definitions for the workflows dashboard. */

export interface WorkflowAvgDuration {
  readonly average_duration_minutes: number;
  readonly workflow_name: string;
}

export interface WorkflowCumulativeDuration {
  readonly cumulative_duration_minutes: number;
  readonly workflow_name: string;
}

export interface WorkflowDashboardResult {
  readonly avgDuration: readonly Record<string, unknown>[];
  readonly cumulativeDuration: readonly Record<string, unknown>[];
  readonly deployments: readonly Record<string, unknown>[];
  readonly dxVsNonDx: readonly Record<string, unknown>[];
  readonly failures: readonly Record<string, unknown>[];
  readonly infraApply: readonly Record<string, unknown>[];
  readonly infraPlan: readonly Record<string, unknown>[];
  readonly runCount: readonly Record<string, unknown>[];
  readonly successRatio: readonly Record<string, unknown>[];
  readonly summary: undefined | WorkflowSummary;
}

export interface WorkflowDeployment {
  readonly run_week: string;
  readonly weekly_deployment_count: number;
}

export interface WorkflowDxVsNonDx {
  readonly cumulative_count: number;
  readonly pipeline_type: string;
  readonly run_date: string;
}

export interface WorkflowFailure {
  readonly failed_runs: number;
  readonly workflow_name: string;
}

export interface WorkflowInfraDuration {
  readonly duration_minutes: number;
  readonly run_timestamp: string;
}

export interface WorkflowRunCount {
  readonly run_count: number;
  readonly workflow_name: string;
}

export interface WorkflowSuccessRatio {
  readonly failed_runs: number;
  readonly success_rate_percentage: number;
  readonly successful_runs: number;
  readonly total_runs: number;
  readonly workflow_name: string;
}

export interface WorkflowSummary {
  readonly avg_duration_minutes: number;
  readonly first_pipeline_date: string;
  readonly total_duration_minutes: number;
  readonly total_pipelines: number;
}
