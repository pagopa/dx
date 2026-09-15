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
    "Weekly runs of deploy/release workflows (name matched on deploy, delivery, release or apply). A heuristic proxy for deployment frequency, not an exact count of production releases.",
  dxVsNonDx:
    "Comparison of DX vs non-DX pipeline runs. Measures adoption of standardized deployment tools.",
  failedRunDuration:
    "Total pipeline time spent in failed runs. Time consumed without delivering a result.",
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
    "Pipeline runs that completed successfully in the selected period. The period is anchored to the most recent available data, not to today, so it always covers the same number of days before the latest run. Failed runs are excluded: their count and time cost appear in the failure charts and in 'Time in Failed Runs'.",
  successFailureRatio:
    "Success rate percentage for each pipeline. Key reliability metric for CI/CD health.",
  title:
    "Monitors CI/CD pipeline metrics including build success rates, execution times, and failure patterns.",
  totalDuration:
    "Total pipeline time spent in this period. Helps calculate resource utilization costs.",
} as const;
