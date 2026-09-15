/** Deterministic insights for the Pull Requests Review dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  confidenceFromSample,
  formatNumber,
  formatPercent,
  formatSpreadRatio,
  halfSplitChange,
  severityFromChange,
  severityFromTarget,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface PullRequestsReviewInsightsInput {
  readonly cards: {
    readonly avgTimeToFirstReview: null | number;
    readonly avgTimeToMerge: null | number;
  };
  readonly firstReviewPercentiles?: {
    readonly count?: number;
    readonly p50: null | number;
    readonly p85: null | number;
    readonly p95: null | number;
  };
  readonly mergedWithoutReviewShare: null | number;
  readonly reviewDistribution: readonly {
    readonly changeRequests: number;
    readonly reviewer: string;
    readonly totalReviews: number;
  }[];
  readonly timeToFirstReviewTrend: readonly {
    readonly avgHoursToFirstReview: number;
  }[];
}

const reviewVsMergeInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const { avgTimeToFirstReview, avgTimeToMerge } = input.cards;

  if (avgTimeToFirstReview === null || avgTimeToMerge === null) {
    return null;
  }

  const total = avgTimeToFirstReview + avgTimeToMerge;

  if (total <= 0) {
    return null;
  }

  const reviewShare = share(avgTimeToFirstReview, total);

  if (reviewShare === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    reviewShare,
    INSIGHT_THRESHOLDS.reviewWaitDominanceShare,
  );
  const reviewDominant = reviewShare > 0.5;

  return {
    action: reviewDominant
      ? "Reduce the wait before the first review: that is where time accumulates."
      : "The bottleneck is after approval: check merges waiting to land.",
    category: "velocity",
    detail: `Waiting for the first review takes ${formatNumber(avgTimeToFirstReview)}h on average (over PRs created in the period), while the wait from last approval to merge is ${formatNumber(avgTimeToMerge)}h (over PRs merged in the period). The pre-review wait is ${formatPercent(reviewShare)} of the combined wait; the two figures come from different populations, not from the same PR lifecycle.`,
    id: "review-vs-merge-split",
    severity,
    title:
      severity === "positive"
        ? "Review wait within threshold"
        : "Wait time happens before review",
    value: { current: reviewShare * 100, unit: "%" },
  };
};

const firstReviewTargetInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const value = input.cards.avgTimeToFirstReview;

  if (value === null) {
    return null;
  }

  const withinTarget = value <= METRIC_TARGETS.timeToFirstReviewHours;

  return {
    category: "velocity",
    confidence: confidenceFromSample(input.firstReviewPercentiles?.count),
    detail: `Average time to first review is ${formatNumber(value)}h against a ${METRIC_TARGETS.timeToFirstReviewHours}h target.`,
    id: "review-first-review-target",
    sampleSize: input.firstReviewPercentiles?.count,
    severity: severityFromTarget(value, METRIC_TARGETS.timeToFirstReviewHours, {
      higherIsBetter: false,
      tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
    }),
    title: withinTarget ? "First review within target" : "First review is slow",
    value: { current: value, unit: "hours" },
  };
};

const busFactorInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const totalReviews = input.reviewDistribution.reduce(
    (sum, row) => sum + row.totalReviews,
    0,
  );

  if (totalReviews === 0) {
    return null;
  }

  const top = [...input.reviewDistribution].sort(
    (left, right) => right.totalReviews - left.totalReviews,
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = share(top.totalReviews, totalReviews);

  if (topShare === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    topShare,
    INSIGHT_THRESHOLDS.reviewBusFactorShare,
  );
  const concentrated = severity !== "positive";

  return {
    action: concentrated
      ? "Spread reviews across more people to reduce dependency risk."
      : undefined,
    category: "risk",
    confidence: confidenceFromSample(totalReviews),
    detail: `${top.reviewer} performed ${formatPercent(topShare)} of the reviews in the period.`,
    evidence: [{ label: `${top.reviewer}: ${top.totalReviews} reviews` }],
    id: "review-bus-factor",
    sampleSize: totalReviews,
    severity,
    title: concentrated
      ? "Reviews concentrated on few people"
      : "Reviews well distributed",
    value: { current: topShare * 100, unit: "%" },
  };
};

const reviewLatencyTrendInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const change = halfSplitChange(
    input.timeToFirstReviewTrend.map((row) => row.avgHoursToFirstReview),
  );

  if (change === null) {
    return null;
  }

  const severity = severityFromChange(change.deltaPct, {
    higherIsBetter: false,
    significantChangePct: METRIC_TARGETS.significantChangePct,
  });

  return {
    category: "velocity",
    detail: `Time to first review moved from ${formatNumber(change.firstAverage)}h to ${formatNumber(change.secondAverage)}h (${formatNumber(change.deltaPct, 0)}%).`,
    id: "review-latency-trend",
    severity,
    title:
      severity === "positive"
        ? "First review time improving"
        : severity === "warning"
          ? "First review time worsening"
          : "First review time stable",
    value: {
      current: change.secondAverage,
      deltaPct: change.deltaPct,
      unit: "hours",
    },
  };
};

const unreviewedMergeInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const shareValue = input.mergedWithoutReviewShare;

  if (shareValue === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    shareValue,
    INSIGHT_THRESHOLDS.unreviewedMergeShare,
  );
  const risky = severity !== "positive";

  return {
    action: risky ? "Encourage at least one review before merging." : undefined,
    category: "quality",
    detail: `${formatPercent(shareValue)} of merged pull requests received no review.`,
    id: "review-merged-without-review",
    severity,
    title: risky ? "Several merges without review" : "Merges are reviewed",
    value: { current: shareValue * 100, unit: "%" },
  };
};

const firstReviewSpreadInsight = (
  input: PullRequestsReviewInsightsInput,
): Insight | null => {
  const { count, p50, p95 } = input.firstReviewPercentiles ?? {};

  if (p50 === null || p50 === undefined || p95 === null || p95 === undefined) {
    return null;
  }

  const ratio = share(p95, p50);

  if (ratio === null) {
    return null;
  }

  const measurable = p50 >= INSIGHT_THRESHOLDS.spreadMinMedianHours;
  const severity = measurable
    ? severityFromUpperThreshold(ratio, INSIGHT_THRESHOLDS.leadTimeSpreadRatio)
    : "neutral";

  return {
    category: "velocity",
    confidence: confidenceFromSample(count),
    detail: `The median PR waits ${formatNumber(p50)}h for its first review, while the slowest 5% wait ${formatNumber(p95)}h${formatSpreadRatio(ratio)}.`,
    id: "review-first-review-spread",
    sampleSize: count,
    severity,
    title:
      severity === "positive"
        ? "First-review wait spread contained"
        : "First-review wait spread",
    value: { current: p95, label: "95th percentile", unit: "hours" },
  };
};

/** Builds the ordered list of insights for the Pull Requests Review dashboard. */
export const buildPullRequestsReviewInsights = (
  input: PullRequestsReviewInsightsInput,
): Insight[] =>
  sortInsights(
    [
      reviewVsMergeInsight(input),
      firstReviewTargetInsight(input),
      firstReviewSpreadInsight(input),
      unreviewedMergeInsight(input),
      busFactorInsight(input),
      reviewLatencyTrendInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
