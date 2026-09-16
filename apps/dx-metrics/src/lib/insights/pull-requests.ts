/** Deterministic insights for the Pull Requests dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { LARGE_PR_BUCKET_LABELS } from "@/lib/pr-size-buckets";
import { paretoShare, percentChange, share } from "@/lib/stats";

import {
  confidenceFromFit,
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

export interface PullRequestsInsightsInput {
  readonly cards: {
    readonly avgLeadTime: null | number;
  };
  readonly leadTimeMovingAvg: readonly { readonly avgLeadTimeDays: number }[];
  readonly leadTimePercentiles?: {
    readonly count?: number;
    readonly p50: null | number;
    readonly p85: null | number;
    readonly p95: null | number;
  };
  readonly mergedPrs: readonly { readonly prCount: number }[];
  /**
   * Organisation-wide lead-time benchmark, when the caller fetched it. Lets an
   * insight compare this repository with its peers instead of only against an
   * absolute target. Absent (or null inside) when no peer data exists.
   */
  readonly peerBenchmark?: {
    readonly leadTimeMedian: null | number;
    readonly peerCount: number;
    readonly percentileRank: null | number;
  };
  readonly previousLeadTime?: null | number;
  readonly prSizeDistribution: readonly {
    readonly prCount: number;
    readonly sizeRange: string;
  }[];
  readonly slowestPrs: readonly {
    readonly leadTimeDays: number;
    readonly number?: number;
    readonly title?: string;
  }[];
  readonly unmergedPrs: readonly { readonly openPrs: number }[];
}

const leadTimeChangeInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  // One comparison rule for the card and the insight: the current period is
  // compared with the immediately preceding, equally-sized window. This is why
  // the card shows `previous <value>` next to the same delta. Only when the
  // previous window is missing do we fall back to a first-half/second-half
  // split of the same window, and then the fit quality gates the severity.
  const current = input.cards.avgLeadTime;
  const previous = input.previousLeadTime ?? null;

  let deltaPct: null | number = null;
  let firstAverage: number | null = null;
  let secondAverage: number | null = null;
  let conclusive = true;

  if (current !== null && previous !== null) {
    deltaPct = percentChange(current, previous);
    firstAverage = previous;
    secondAverage = current;
  } else {
    const change = halfSplitChange(
      input.leadTimeMovingAvg.map((row) => row.avgLeadTimeDays),
    );

    if (change === null) {
      return null;
    }

    deltaPct = change.deltaPct;
    firstAverage = change.firstAverage;
    secondAverage = change.secondAverage;
    conclusive = change.rSquared >= METRIC_TARGETS.minTrendRSquared;
  }

  if (deltaPct === null || firstAverage === null || secondAverage === null) {
    return null;
  }

  const severity = conclusive
    ? severityFromChange(deltaPct, {
        higherIsBetter: false,
        significantChangePct: METRIC_TARGETS.significantChangePct,
      })
    : "neutral";

  const direction =
    deltaPct === 0 ? "stable" : deltaPct > 0 ? "worsening" : "improving";

  return {
    action:
      deltaPct > 0
        ? "Look at the slowest PRs to find where wait time accumulates."
        : undefined,
    category: "velocity",
    confidence: conclusive ? undefined : "low",
    detail: `Average lead time moved from ${formatNumber(firstAverage)} to ${formatNumber(secondAverage)} days versus the previous period (${formatNumber(deltaPct, 0)}%).${conclusive ? "" : " The period is too noisy to draw conclusions."}`,
    id: "pr-lead-time-change",
    severity,
    title: `Lead time ${direction}`,
    value: {
      current: secondAverage,
      deltaPct,
      label: "period average",
      unit: "days",
    },
  };
};

/**
 * Minimum number of peers behind a median before it is worth comparing
 * against: a "median" over one or two repositories is just noise.
 */
const MIN_PEER_COUNT = 3;

const leadTimePeerComparisonInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  const { cards, peerBenchmark } = input;
  const current = cards.avgLeadTime;
  const median = peerBenchmark?.leadTimeMedian;

  if (
    current === null ||
    median === null ||
    median === undefined ||
    (peerBenchmark?.peerCount ?? 0) < MIN_PEER_COUNT
  ) {
    return null;
  }

  const rank = peerBenchmark?.percentileRank ?? null;

  if (rank === null) {
    return null;
  }

  // Lower lead time is better, so a high share of peers below this repository
  // means it is among the slowest. The 0.25/0.75 cut-offs mirror how the
  // benchmark page classifies "best in class" and "needs attention".
  const severity =
    rank >= 0.75 ? "warning" : rank <= 0.25 ? "positive" : "neutral";
  const peers = peerBenchmark?.peerCount ?? 0;

  return {
    action:
      severity === "warning"
        ? "Compare with the Benchmark page to see which peers pull the median down and what they do differently."
        : undefined,
    category: "velocity",
    confidence: confidenceFromSample(input.leadTimePercentiles?.count),
    detail: `Average lead time is ${formatNumber(current)} days; the median across ${peers} organisation repositories is ${formatNumber(median)} days. This repository sits at the ${formatNumber(rank * 100, 0)}th percentile (higher means slower than more peers).`,
    id: "pr-lead-time-peers",
    sampleSize: input.leadTimePercentiles?.count,
    severity,
    title:
      severity === "warning"
        ? "Lead time worse than most peers"
        : severity === "positive"
          ? "Lead time better than most peers"
          : "Lead time in line with peers",
    value: {
      current,
      label: "average",
      unit: "days",
    },
  };
};

const leadTimeTargetInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  const value = input.cards.avgLeadTime;

  if (value === null) {
    return null;
  }

  const withinTarget = value <= METRIC_TARGETS.leadTimeDays;
  const median = input.leadTimePercentiles?.p50;

  return {
    category: "velocity",
    confidence: confidenceFromSample(input.leadTimePercentiles?.count),
    detail: `Average lead time is ${formatNumber(value)} days against a ${METRIC_TARGETS.leadTimeDays}-day target${median === null || median === undefined ? "" : `. The target is compared with the mean, which a long tail pulls up; the median is ${formatNumber(median)} days`}.`,
    id: "pr-lead-time-target",
    sampleSize: input.leadTimePercentiles?.count,
    severity: severityFromTarget(value, METRIC_TARGETS.leadTimeDays, {
      higherIsBetter: false,
      tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
    }),
    title: withinTarget ? "Lead time within target" : "Lead time above target",
    value: { current: value, label: "average", unit: "days" },
  };
};

const leadTimeSpreadInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  const { count, p50, p95 } = input.leadTimePercentiles ?? {};

  if (p50 === null || p50 === undefined || p95 === null || p95 === undefined) {
    return null;
  }

  const ratio = share(p95, p50);

  if (ratio === null) {
    return null;
  }

  const measurable = p50 >= INSIGHT_THRESHOLDS.spreadMinMedianDays;
  const severity = measurable
    ? severityFromUpperThreshold(ratio, INSIGHT_THRESHOLDS.leadTimeSpreadRatio)
    : "neutral";
  const poor = severity === "warning" || severity === "critical";

  return {
    action: poor
      ? "Investigate the slowest PRs: a small tail drives most of the wait."
      : undefined,
    category: "velocity",
    confidence: confidenceFromSample(count),
    detail: `The median PR merges in ${formatNumber(p50)} days, while the slowest 5% exceeds ${formatNumber(p95)} days${formatSpreadRatio(ratio)}.`,
    id: "pr-lead-time-spread",
    sampleSize: count,
    severity,
    title: poor ? "Lead-time spread too wide" : "Lead-time spread contained",
    value: { current: p95, label: "95th percentile", unit: "days" },
  };
};

const prSizeInsight = (input: PullRequestsInsightsInput): Insight | null => {
  const total = input.prSizeDistribution.reduce(
    (sum, row) => sum + row.prCount,
    0,
  );

  if (total === 0) {
    return null;
  }

  const large = input.prSizeDistribution
    .filter((row) => LARGE_PR_BUCKET_LABELS.has(row.sizeRange))
    .reduce((sum, row) => sum + row.prCount, 0);
  const largeShare = share(large, total);

  if (largeShare === null) {
    return null;
  }

  const isRisky = largeShare > INSIGHT_THRESHOLDS.largePrShare;

  return {
    action: isRisky
      ? "Split large changes into smaller, focused pull requests."
      : undefined,
    category: "risk",
    confidence: confidenceFromSample(total),
    detail: `${formatPercent(largeShare)} of pull requests add more than 500 lines.`,
    id: "pr-size-risk",
    sampleSize: total,
    severity: isRisky ? "warning" : "positive",
    title: isRisky
      ? "Many large pull requests"
      : "Reasonably sized pull requests",
    value: { current: largeShare * 100, unit: "%" },
  };
};

const backlogInsight = (input: PullRequestsInsightsInput): Insight | null => {
  const series = input.unmergedPrs.map((row) => row.openPrs);

  if (series.length === 0) {
    return null;
  }

  const change = halfSplitChange(series);
  const latest = series[series.length - 1] ?? 0;

  if (change === null) {
    if (latest === 0) {
      return null;
    }

    return {
      category: "quality",
      detail: `There are currently ${latest} pull requests open and never merged.`,
      id: "pr-backlog",
      severity: "neutral",
      title: "Open pull requests",
      value: { current: latest, unit: "PRs" },
    };
  }

  if (latest === 0 && change.firstAverage === 0 && change.secondAverage === 0) {
    return null;
  }

  const growing = change.deltaPct > METRIC_TARGETS.significantChangePct;

  return {
    action: growing
      ? "Check whether pull requests wait too long for review."
      : undefined,
    category: "quality",
    confidence: confidenceFromFit(change.rSquared),
    detail: `Never-merged open pull requests moved from an average of ${formatNumber(change.firstAverage, 0)} to ${formatNumber(change.secondAverage, 0)} (${formatNumber(change.deltaPct, 0)}%).`,
    id: "pr-backlog",
    severity: growing ? "warning" : "neutral",
    title: growing
      ? "Open pull request backlog growing"
      : "Open pull request backlog stable",
    value: { current: latest, unit: "PRs" },
  };
};

const throughputInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  const change = halfSplitChange(input.mergedPrs.map((row) => row.prCount));

  if (change === null) {
    return null;
  }

  if (change.firstAverage === 0 && change.secondAverage === 0) {
    return null;
  }

  const severity = severityFromChange(change.deltaPct, {
    higherIsBetter: true,
    significantChangePct: METRIC_TARGETS.significantChangePct,
  });

  const totalMerged = input.mergedPrs.reduce(
    (sum, row) => sum + row.prCount,
    0,
  );

  return {
    category: "velocity",
    confidence:
      confidenceFromFit(change.rSquared) ?? confidenceFromSample(totalMerged),
    detail: `Average throughput moved from ${formatNumber(change.firstAverage, 1)} to ${formatNumber(change.secondAverage, 1)} merged PRs per period (${formatNumber(change.deltaPct, 0)}%).`,
    id: "pr-throughput-trend",
    sampleSize: totalMerged,
    severity,
    title:
      severity === "positive"
        ? "Throughput growing"
        : severity === "warning"
          ? "Throughput declining"
          : "Throughput stable",
    value: { current: change.secondAverage, deltaPct: change.deltaPct },
  };
};

const slowPrConcentrationInsight = (
  input: PullRequestsInsightsInput,
  repositoryUrl?: string,
): Insight | null => {
  const concentration = paretoShare(
    input.slowestPrs.map((pr) => pr.leadTimeDays),
    0.1,
  );

  if (concentration === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    concentration,
    INSIGHT_THRESHOLDS.slowPrConcentrationShare,
  );

  // When the caller knows the repository, point at the actual offending pull
  // requests so the reading is actionable instead of just descriptive.
  const evidence =
    repositoryUrl === undefined
      ? undefined
      : input.slowestPrs
          .filter((pr) => pr.number !== undefined)
          .slice()
          .sort((left, right) => right.leadTimeDays - left.leadTimeDays)
          .slice(0, 3)
          .map((pr) => ({
            href: `${repositoryUrl}/pull/${pr.number}`,
            label: `#${pr.number} ${pr.title ?? ""}`.trim(),
          }));

  return {
    category: "velocity",
    confidence: confidenceFromSample(input.slowestPrs.length),
    detail: `The slowest 10% of pull requests account for ${formatPercent(concentration)} of the total wait time across the analyzed PRs.`,
    evidence: evidence && evidence.length > 0 ? evidence : undefined,
    id: "pr-slow-concentration",
    sampleSize: input.slowestPrs.length,
    severity,
    title:
      severity === "positive"
        ? "Wait time not concentrated"
        : "Wait-time concentration",
    value: { current: concentration * 100, unit: "%" },
  };
};

/**
 * Builds the ordered list of insights for the Pull Requests dashboard.
 *
 * `repositoryUrl` is optional: when provided, insights can carry deep links to
 * the concrete pull requests behind a reading. `peerBenchmark` is optional:
 * when provided, a peer-comparison insight anchors the lead time to the
 * organisation median and this repository's percentile rank.
 */
export const buildPullRequestsInsights = (
  input: PullRequestsInsightsInput,
  repositoryUrl?: string,
  peerBenchmark?: PullRequestsInsightsInput["peerBenchmark"],
): Insight[] =>
  sortInsights(
    [
      leadTimeChangeInsight(input),
      leadTimeTargetInsight(input),
      leadTimePeerComparisonInsight(input),
      leadTimeSpreadInsight(input),
      prSizeInsight(input),
      backlogInsight(input),
      throughputInsight(input),
      slowPrConcentrationInsight(input, repositoryUrl),
    ].filter((insight): insight is Insight => insight !== null),
  );
