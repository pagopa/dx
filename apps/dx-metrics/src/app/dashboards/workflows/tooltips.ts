/**
 * Tooltip content for Workflows dashboard
 */

export const workflowsTooltips = {
  avgDuration:
    "Average pipeline execution time in minutes. Identifies if pipelines are efficient.",
  avgPipelineDuration:
    "Average execution time per pipeline. Shows which pipelines are performance bottlenecks.",
  cumulativeDuration:
    "Total time spent per pipeline. Helps prioritize optimization efforts.",
  deploymentsToProduction:
    "Weekly production deployments. Key metric for deployment frequency and release cadence.",
  dxVsNonDx:
    "Comparison of DX vs non-DX pipeline runs. Measures adoption of standardized deployment tools.",
  firstRun:
    "Date of first pipeline execution in this period. Indicates when pipeline was enabled.",
  infraApplyDuration:
    "Apply phase execution time for infrastructure changes. Measures deployment risk exposure.",
  infraPlanDuration:
    "Plan phase execution time for infrastructure pipelines. Indicates infrastructure complexity.",
  pipelineFailures:
    "Count of failed runs by pipeline. Identifies which pipelines need reliability improvements.",
  pipelineRunCount:
    "Total runs per pipeline. Indicates pipeline usage and importance.",
  runsCount:
    "Total number of pipeline executions. Measures CI/CD activity and testing frequency.",
  successFailureRatio:
    "Success rate percentage for each pipeline. Key reliability metric for CI/CD health.",
  title:
    "Monitors CI/CD pipeline metrics including build success rates, execution times, and failure patterns.",
  totalDuration:
    "Total pipeline time spent in this period. Helps calculate resource utilization costs.",
} as const;
