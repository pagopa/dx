/**
 * Tooltip content for Workflows dashboard
 */

export const workflowsTooltips = {
  avgDuration:
    "Average pipeline execution time in minutes. Identifies if pipelines are efficient.",
  avgPipelineDuration:
    "Average execution time per pipeline. Shows which pipelines are performance bottlenecks. Only the ten pipelines with the highest average are shown.",
  cumulativeDuration:
    "Total time spent per pipeline. Helps prioritize optimization efforts. Only the ten pipelines with the highest total are shown.",
  deploymentsToProduction:
    "Weekly runs of deploy/release workflows (name matched on deploy, delivery, release or apply). A heuristic proxy for deployment frequency, not an exact count of production releases.",
  dxVsNonDx:
    "Comparison of DX vs non-DX pipeline runs. Measures adoption of standardized deployment tools.",
  durationTrend:
    "Average execution time over time for the two slowest pipelines in the selected range, bucketed by day for short ranges and by week above 240 days. Same population as 'Pipeline Average Duration': completed, successful runs only.",
  failedRunDuration:
    "Total pipeline time spent in failed runs. Time consumed without delivering a result.",
  failureTrend:
    "Failed runs over time for the two pipelines with the most failures in the selected range, bucketed by day for short ranges and by week above 240 days. Same population as 'Pipeline Failures'.",
  firstRun:
    "Date of first pipeline execution in this period. Indicates when pipeline was enabled.",
  pipelineFailures:
    "Count of failed runs by pipeline. Identifies which pipelines need reliability improvements. Only the ten pipelines with the most failures are shown.",
  pipelineRunCount:
    "Total runs per pipeline. Indicates pipeline usage and importance. Only the ten most run pipelines are shown.",
  runsCount:
    "Pipeline runs that completed successfully in the selected range. Failed runs are excluded: their count and time cost appear in the failure charts and in 'Time in Failed Runs'.",
  successFailureRatio:
    "Success rate percentage for each pipeline. Key reliability metric for CI/CD health.",
  title:
    "Monitors CI/CD pipeline metrics including build success rates, execution times, and failure patterns.",
  totalDuration:
    "Total pipeline time spent in this period. Helps calculate resource utilization costs.",
  triggerTypes:
    "Share of runs in the period by how they were triggered. Manual covers runs started on demand by a person (workflow_dispatch); automatic covers every repository- or API-driven event (push, pull request, schedule, workflow_call, ...). Runs imported before the trigger was recorded are excluded from the chart; the caption shows how many were left out. The excluded share shrinks as the importer refreshes recent runs and disappears for the period once a backfill covers it.",
  triggerBreakdown:
    "Runs per workflow, split into how they were triggered: each bar is one workflow's recorded runs, stacked by manual (workflow_dispatch) and automatic (every other recorded event). Runs without a recorded trigger are excluded from the bars; the caption shows how many. Only the ten workflows with the most recorded runs are shown, busiest first.",
} as const;
