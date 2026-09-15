/** Deterministic insights for the Workflows dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { paretoShare, percentChange, share } from "@/lib/stats";

import {
  formatNumber,
  formatPercent,
  formatSpreadRatio,
  severityFromTarget,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface WorkflowsInsightsInput {
  readonly cumulativeDuration: readonly {
    readonly cumulativeDurationMinutes: number;
    readonly workflowName: string;
  }[];
  readonly deployments: readonly { readonly weeklyDeploymentCount: number }[];
  readonly durationPercentiles?: {
    readonly p50: null | number;
    readonly p85: null | number;
    readonly p95: null | number;
  };
  readonly failures: readonly {
    readonly failedRuns: number;
    readonly workflowName: string;
  }[];
  readonly successRateStats?: {
    readonly current: null | number;
    readonly previous: null | number;
  };
  readonly successRatio: readonly {
    readonly failedRuns: number;
    readonly successRatePercentage: number;
    readonly totalRuns: number;
    readonly workflowName: string;
  }[];
  readonly summary?: {
    readonly failedDurationMinutes: null | number;
    readonly totalDurationMinutes: null | number;
  };
}

/** Minimum sample size before a success rate is considered meaningful. */
const MIN_RUNS_FOR_SIGNAL = 10;

const failureHotspotInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  const totalFailures = input.failures.reduce(
    (sum, row) => sum + row.failedRuns,
    0,
  );

  if (totalFailures === 0) {
    return null;
  }

  const top = [...input.failures].sort(
    (left, right) => right.failedRuns - left.failedRuns,
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = paretoShare(
    input.failures.map((row) => row.failedRuns),
    0.2,
  );
  const severity =
    topShare === null
      ? "neutral"
      : severityFromUpperThreshold(
          topShare,
          INSIGHT_THRESHOLDS.failureHotspotShare,
        );
  const concentrated = severity !== "positive";

  return {
    action: concentrated
      ? "Start from the workflow with the most failures."
      : undefined,
    category: "reliability",
    detail: `"${top.workflowName}" produced ${top.failedRuns} of ${totalFailures} failures${topShare === null ? "" : `; the top 20% of workflows cause ${formatPercent(topShare)} of them`}.`,
    evidence: [{ label: top.workflowName }],
    id: "workflow-failure-hotspot",
    severity,
    title: concentrated
      ? "Workflow with most failures"
      : "Failures spread across workflows",
    value: { current: top.failedRuns, unit: "failures" },
  };
};

const ciCostHotspotInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  const totalMinutes = input.cumulativeDuration.reduce(
    (sum, row) => sum + row.cumulativeDurationMinutes,
    0,
  );

  if (totalMinutes <= 0) {
    return null;
  }

  const top = [...input.cumulativeDuration].sort(
    (left, right) =>
      right.cumulativeDurationMinutes - left.cumulativeDurationMinutes,
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = paretoShare(
    input.cumulativeDuration.map((row) => row.cumulativeDurationMinutes),
    0.2,
  );
  const severity =
    topShare === null
      ? "neutral"
      : severityFromUpperThreshold(
          topShare,
          INSIGHT_THRESHOLDS.ciCostHotspotShare,
        );

  return {
    category: "reliability",
    detail: `"${top.workflowName}" consumed ${formatNumber(top.cumulativeDurationMinutes, 0)} minutes of CI${topShare === null ? "" : `; the top 20% of workflows absorb ${formatPercent(topShare)} of the time`}.`,
    id: "workflow-ci-cost-hotspot",
    severity,
    title:
      severity === "positive"
        ? "CI time well distributed"
        : "CI time concentrated",
    value: { current: top.cumulativeDurationMinutes, unit: "minutes" },
  };
};

const successRateInsight = (input: WorkflowsInsightsInput): Insight | null => {
  const significant = input.successRatio.filter(
    (row) => row.totalRuns >= MIN_RUNS_FOR_SIGNAL,
  );

  if (significant.length === 0) {
    return null;
  }

  const belowTarget = significant.filter(
    (row) => row.successRatePercentage < METRIC_TARGETS.workflowSuccessRatePct,
  );

  if (belowTarget.length === 0) {
    return {
      category: "reliability",
      detail: `Every workflow with at least ${MIN_RUNS_FOR_SIGNAL} runs is above the ${METRIC_TARGETS.workflowSuccessRatePct}% success threshold.`,
      id: "workflow-success-rate",
      severity: "positive",
      title: "Workflow reliability on target",
    };
  }

  const worst = [...belowTarget].sort(
    (left, right) => left.successRatePercentage - right.successRatePercentage,
  )[0];

  if (worst === undefined) {
    return null;
  }

  return {
    action: "Investigate recurring failures in the least reliable workflows.",
    category: "reliability",
    detail: `${belowTarget.length} of ${significant.length} workflows are below the ${METRIC_TARGETS.workflowSuccessRatePct}% success threshold. The worst is "${worst.workflowName}" (${formatNumber(worst.successRatePercentage)}%).`,
    id: "workflow-success-rate",
    severity: severityFromTarget(
      worst.successRatePercentage,
      METRIC_TARGETS.workflowSuccessRatePct,
      {
        higherIsBetter: true,
        tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
      },
    ),
    title: "Workflows below the success threshold",
    value: { current: worst.successRatePercentage, unit: "%" },
  };
};

const deploymentFrequencyInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  if (input.deployments.length === 0) {
    return null;
  }

  const total = input.deployments.reduce(
    (sum, row) => sum + row.weeklyDeploymentCount,
    0,
  );
  const average = total / input.deployments.length;
  const frequent = average >= 1;

  return {
    category: "reliability",
    detail: `An average of ${formatNumber(average)} deployments per week across the observed periods.`,
    id: "workflow-deployment-frequency",
    severity: frequent ? "positive" : "warning",
    title: frequent
      ? "Healthy deployment frequency"
      : "Low deployment frequency",
    value: { current: average, unit: "deploy/week" },
  };
};

const failedRunWasteInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  const failedMinutes = input.summary?.failedDurationMinutes;
  const successMinutes = input.summary?.totalDurationMinutes;

  if (
    failedMinutes === null ||
    failedMinutes === undefined ||
    failedMinutes <= 0
  ) {
    return null;
  }

  const total = failedMinutes + (successMinutes ?? 0);
  const waste = share(failedMinutes, total);

  if (waste === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    waste,
    INSIGHT_THRESHOLDS.failedRunWasteShare,
  );
  const significant = severity !== "positive";

  return {
    action: significant
      ? "Reduce failed runs: they consume CI time without delivering."
      : undefined,
    category: "reliability",
    detail: `${formatNumber(failedMinutes, 0)} minutes of CI were spent in failed runs (${formatPercent(waste)} of total duration).`,
    id: "workflow-failed-run-waste",
    severity,
    title: significant ? "CI time wasted on failed runs" : "Limited CI waste",
    value: { current: failedMinutes, unit: "minutes" },
  };
};

const overallSuccessRateInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  const current = input.successRateStats?.current;

  if (current === null || current === undefined) {
    return null;
  }

  const previous = input.successRateStats?.previous ?? null;
  const deltaPct = previous === null ? null : percentChange(current, previous);
  const withinTarget = current >= METRIC_TARGETS.workflowSuccessRatePct;
  const worsening =
    deltaPct !== null &&
    deltaPct < -METRIC_TARGETS.significantChangePct &&
    previous !== null;
  const severity = worsening
    ? "warning"
    : severityFromTarget(current, METRIC_TARGETS.workflowSuccessRatePct, {
        higherIsBetter: true,
        tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
      });

  return {
    category: "reliability",
    detail: `Overall pipeline success rate is ${formatNumber(current)}%${deltaPct === null ? "" : ` (first half ${formatNumber(previous ?? 0)}%, ${formatNumber(deltaPct, 0)}%)`}.`,
    id: "workflow-overall-success-rate",
    severity,
    title:
      withinTarget && !worsening
        ? "Overall pipeline reliability healthy"
        : "Overall pipeline reliability needs attention",
    value: {
      current,
      ...(deltaPct === null
        ? {}
        : { deltaPct, previous: previous ?? undefined }),
      unit: "%",
    },
  };
};

const durationSpreadInsight = (
  input: WorkflowsInsightsInput,
): Insight | null => {
  const { p50, p95 } = input.durationPercentiles ?? {};

  if (p50 === null || p50 === undefined || p95 === null || p95 === undefined) {
    return null;
  }

  const ratio = share(p95, p50);

  if (ratio === null) {
    return null;
  }

  const measurable = p50 >= INSIGHT_THRESHOLDS.spreadMinMedianMinutes;
  const severity = measurable
    ? severityFromUpperThreshold(ratio, INSIGHT_THRESHOLDS.durationSpreadRatio)
    : "neutral";

  return {
    category: "reliability",
    detail: `The median pipeline takes ${formatNumber(p50)} min, while the slowest 5% exceed ${formatNumber(p95)} min${formatSpreadRatio(ratio)}.`,
    id: "workflow-duration-spread",
    severity,
    title:
      severity === "positive"
        ? "Pipeline duration spread contained"
        : "Pipeline duration spread",
    value: { current: p95, unit: "minutes" },
  };
};

/** Builds the ordered list of insights for the Workflows dashboard. */
export const buildWorkflowsInsights = (
  input: WorkflowsInsightsInput,
): Insight[] =>
  sortInsights(
    [
      failureHotspotInsight(input),
      ciCostHotspotInsight(input),
      successRateInsight(input),
      overallSuccessRateInsight(input),
      failedRunWasteInsight(input),
      durationSpreadInsight(input),
      deploymentFrequencyInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
