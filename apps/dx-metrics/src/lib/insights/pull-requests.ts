/** Deterministic insights for the Pull Requests dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { paretoShare, percentChange, share } from "@/lib/stats";

import {
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
  readonly leadTimeTrend?: readonly {
    readonly date: string;
    readonly trendLine: number;
  }[];
  readonly mergedPrs: readonly { readonly prCount: number }[];
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

const LARGE_PR_RANGES = new Set(["501-1000", "1000+"]);

const leadTimeTrendInsight = (
  input: PullRequestsInsightsInput,
): Insight | null => {
  // Primary signal: the endpoints of the fitted trend line, which is exactly
  // what the "Lead Time Trend" chart draws. This guarantees the card delta and
  // the chart cannot point in opposite directions.
  const trend = input.leadTimeTrend ?? [];
  const trendFirst = trend[0]?.trendLine;
  const trendLast = trend[trend.length - 1]?.trendLine;

  let deltaPct: null | number = null;
  let firstAverage: number | null = null;
  let secondAverage: number | null = null;
  let conclusive = true;

  if (
    trend.length >= 2 &&
    trendFirst !== undefined &&
    trendLast !== undefined &&
    trendFirst !== 0
  ) {
    deltaPct = percentChange(trendLast, trendFirst);
    firstAverage = trendFirst;
    secondAverage = trendLast;
  } else {
    // Fallbacks for short windows with no fitted line.
    const current = input.cards.avgLeadTime;
    const previous = input.previousLeadTime ?? null;

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
    detail: `The lead-time trend moved from ${formatNumber(firstAverage)} to ${formatNumber(secondAverage)} days (${formatNumber(deltaPct, 0)}%).${conclusive ? "" : " The week-by-week series is too noisy to draw conclusions."}`,
    id: "pr-lead-time-trend",
    severity,
    title: `Lead time ${direction}`,
    value: {
      current: secondAverage,
      deltaPct,
      label: "trend at period end",
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

  return {
    category: "velocity",
    detail: `Average lead time is ${formatNumber(value)} days against a ${METRIC_TARGETS.leadTimeDays}-day target.`,
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
    .filter((row) => LARGE_PR_RANGES.has(row.sizeRange))
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

  return {
    category: "velocity",
    detail: `Average throughput moved from ${formatNumber(change.firstAverage, 1)} to ${formatNumber(change.secondAverage, 1)} merged PRs per period (${formatNumber(change.deltaPct, 0)}%).`,
    id: "pr-throughput-trend",
    sampleSize: input.mergedPrs.reduce((sum, row) => sum + row.prCount, 0),
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
 * the concrete pull requests behind a reading.
 */
export const buildPullRequestsInsights = (
  input: PullRequestsInsightsInput,
  repositoryUrl?: string,
): Insight[] =>
  sortInsights(
    [
      leadTimeTrendInsight(input),
      leadTimeTargetInsight(input),
      leadTimeSpreadInsight(input),
      prSizeInsight(input),
      backlogInsight(input),
      throughputInsight(input),
      slowPrConcentrationInsight(input, repositoryUrl),
    ].filter((insight): insight is Insight => insight !== null),
  );
