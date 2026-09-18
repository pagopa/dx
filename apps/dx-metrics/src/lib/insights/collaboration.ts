/** Deterministic insights for the Review & Collaboration dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";

import {
  confidenceFromSample,
  formatNumber,
  formatPercent,
  severityFromTarget,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight, InsightEvidence } from "./types";

/** The summary figures the collaboration insights are computed on. */
export interface CollaborationSummary {
  readonly avgTimeToFirstReviewHours: null | number;
  readonly awaitingReviewCount: number;
  readonly churnShare: null | number;
  readonly medianReviewRounds: null | number;
  readonly overdueAwaitingCount: number;
  readonly topReviewerShare: null | number;
  readonly totalReviews: number;
}

/** The oldest open PRs waiting for a first approval, used as evidence. */
export interface CollaborationAwaitingReview {
  readonly number: number;
  readonly repository: string;
  readonly title: string;
}

export interface CollaborationInsightsInput {
  readonly awaitingReview: readonly CollaborationAwaitingReview[];
  readonly summary: CollaborationSummary;
}

const firstReviewTargetInsight = (
  input: CollaborationInsightsInput,
): Insight | null => {
  const value = input.summary.avgTimeToFirstReviewHours;

  if (value === null) {
    return null;
  }

  const severity = severityFromTarget(
    value,
    METRIC_TARGETS.timeToFirstReviewHours,
    {
      higherIsBetter: false,
      tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
    },
  );

  return {
    category: "velocity",
    confidence: confidenceFromSample(input.summary.totalReviews),
    detail: `Average time to first review across every configured repository is ${formatNumber(value)}h against a ${METRIC_TARGETS.timeToFirstReviewHours}h target.`,
    id: "collab-first-review-target",
    sampleSize: input.summary.totalReviews,
    severity,
    title:
      severity === "positive"
        ? "First review within target"
        : "First review is slow",
    value: { current: value, unit: "hours" },
  };
};

const busFactorInsight = (
  input: CollaborationInsightsInput,
): Insight | null => {
  const value = input.summary.topReviewerShare;

  if (value === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    value,
    INSIGHT_THRESHOLDS.reviewBusFactorShare,
  );
  const concentrated = severity !== "positive";

  return {
    action: concentrated
      ? "Spread reviews across more people to reduce dependency risk."
      : undefined,
    category: "risk",
    confidence: confidenceFromSample(input.summary.totalReviews),
    detail: `The busiest reviewer performed ${formatPercent(value)} of the ${formatNumber(input.summary.totalReviews, 0)} human reviews in the period.`,
    id: "collab-bus-factor",
    sampleSize: input.summary.totalReviews,
    severity,
    title: concentrated
      ? "Reviews concentrated on few people"
      : "Reviews well distributed",
    value: { current: value * 100, unit: "%" },
  };
};

const reviewChurnInsight = (
  input: CollaborationInsightsInput,
): Insight | null => {
  const value = input.summary.churnShare;

  if (value === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    value,
    INSIGHT_THRESHOLDS.reviewChurnShare,
  );
  const high = severity !== "positive";

  return {
    action: high
      ? "Clarify requirements before review to reduce change requests and dismissals."
      : undefined,
    category: "quality",
    confidence: confidenceFromSample(input.summary.totalReviews),
    detail: `${formatPercent(value)} of human reviews asked for changes or were dismissed.`,
    id: "collab-review-churn",
    sampleSize: input.summary.totalReviews,
    severity,
    title: high ? "High review churn" : "Review churn contained",
    value: { current: value * 100, unit: "%" },
  };
};

const awaitingReviewInsight = (
  input: CollaborationInsightsInput,
): Insight | null => {
  const { awaitingReviewCount, overdueAwaitingCount } = input.summary;

  // Nothing in the queue: there is no reading to make, not a positive one.
  if (awaitingReviewCount <= 0) {
    return null;
  }

  const overdueShare = overdueAwaitingCount / awaitingReviewCount;
  const severity = severityFromUpperThreshold(
    overdueShare,
    INSIGHT_THRESHOLDS.awaitingReviewShare,
  );

  // Link the oldest PRs only when the repository is known; an unresolved
  // repository would produce a broken URL.
  const evidence: InsightEvidence[] = [...input.awaitingReview]
    .filter((row) => row.repository.length > 0)
    .slice(0, 3)
    .map((row) => ({
      href: `https://github.com/${row.repository}/pull/${row.number}`,
      label: `#${row.number} ${row.title}`,
    }));

  return {
    action:
      severity !== "positive"
        ? "Triage the review queue and nudge reviewers on the oldest open pull requests."
        : undefined,
    category: "quality",
    confidence: confidenceFromSample(awaitingReviewCount),
    detail: `${formatNumber(overdueAwaitingCount, 0)} of ${formatNumber(awaitingReviewCount, 0)} open pull requests have been waiting for a first approval for more than ${METRIC_TARGETS.timeToFirstReviewHours}h.`,
    evidence: evidence.length > 0 ? evidence : undefined,
    id: "collab-awaiting-review",
    sampleSize: awaitingReviewCount,
    severity,
    title:
      severity !== "positive"
        ? "Review queue is backing up"
        : "Review queue under control",
    value: { current: awaitingReviewCount, unit: "PRs" },
  };
};

const reviewRoundsInsight = (
  input: CollaborationInsightsInput,
): Insight | null => {
  const value = input.summary.medianReviewRounds;

  if (value === null) {
    return null;
  }

  return {
    category: "quality",
    confidence: confidenceFromSample(input.summary.totalReviews),
    detail: `The median pull request receives ${formatNumber(value)} rounds of human review. A round is one human review event (approval, change request, comment, or dismissal), so a value near one means most PRs are reviewed once.`,
    id: "collab-review-rounds",
    sampleSize: input.summary.totalReviews,
    severity: "neutral",
    title: "Review rounds are stable",
    value: { current: value, unit: "rounds" },
  };
};

/** Builds the ordered list of insights for the collaboration dashboard. */
export const buildCollaborationInsights = (
  input: CollaborationInsightsInput,
): Insight[] =>
  sortInsights(
    [
      firstReviewTargetInsight(input),
      busFactorInsight(input),
      reviewChurnInsight(input),
      awaitingReviewInsight(input),
      reviewRoundsInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
