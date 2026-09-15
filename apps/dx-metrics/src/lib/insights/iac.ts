/** Deterministic insights for the IaC Pull Requests dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  formatNumber,
  formatPercent,
  formatSpreadRatio,
  halfSplitChange,
  severityFromChange,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface IacInsightsInput {
  readonly leadTimeMovingAvg: readonly { readonly avgLeadTimeDays: number }[];
  readonly leadTimePercentiles?: {
    readonly p50: null | number;
    readonly p85: null | number;
    readonly p95: null | number;
  };
  readonly prsByReviewer: readonly {
    readonly reviewer: string;
    readonly totalPrs: number;
  }[];
  readonly supervisedVsUnsupervised: readonly {
    readonly cumulativeCount: number;
    readonly prType: string;
  }[];
}

const supervisionInsight = (input: IacInsightsInput): Insight | null => {
  const totals = new Map<string, number>();

  for (const row of input.supervisedVsUnsupervised) {
    const current = totals.get(row.prType) ?? 0;
    totals.set(row.prType, Math.max(current, row.cumulativeCount));
  }

  const supervised = totals.get("Supervised PRs") ?? 0;
  const unsupervised = totals.get("Unsupervised PRs") ?? 0;
  const total = supervised + unsupervised;

  if (total === 0) {
    return null;
  }

  const unsupervisedShare = share(unsupervised, total);

  if (unsupervisedShare === null) {
    return null;
  }

  const supervisedShare = share(supervised, total);

  if (unsupervisedShare === null || supervisedShare === null) {
    return null;
  }

  // Unsupervised infrastructure PRs mean product teams own their changes, which
  // is the desired end state. The warning is the opposite: DX implementing most
  // infrastructure work instead of enabling the teams.
  const autonomous = unsupervisedShare >= INSIGHT_THRESHOLDS.unsupervisedShare;
  const dxOwned = supervisedShare >= INSIGHT_THRESHOLDS.dxSupervisedShare;

  return {
    action: dxOwned
      ? "Let product teams own their infrastructure PRs; DX should enable, not implement."
      : undefined,
    category: "risk",
    detail: `${formatPercent(unsupervisedShare)} of IaC pull requests are unsupervised (${unsupervised}/${total}).`,
    id: "iac-supervision",
    severity: autonomous ? "positive" : dxOwned ? "warning" : "neutral",
    title: autonomous
      ? "Teams own their infrastructure changes"
      : dxOwned
        ? "DX implements most infrastructure pull requests"
        : "Mixed infrastructure ownership",
    value: { current: unsupervisedShare * 100, unit: "%" },
  };
};

const leadTimeTrendInsight = (input: IacInsightsInput): Insight | null => {
  const change = halfSplitChange(
    input.leadTimeMovingAvg.map((row) => row.avgLeadTimeDays),
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
    detail: `IaC lead time moved from ${formatNumber(change.firstAverage)} to ${formatNumber(change.secondAverage)} days (${formatNumber(change.deltaPct, 0)}%).`,
    id: "iac-lead-time-trend",
    severity,
    title:
      severity === "positive"
        ? "IaC lead time improving"
        : severity === "warning"
          ? "IaC lead time worsening"
          : "IaC lead time stable",
    value: {
      current: change.secondAverage,
      deltaPct: change.deltaPct,
      unit: "days",
    },
  };
};

const reviewerLoadInsight = (input: IacInsightsInput): Insight | null => {
  const total = input.prsByReviewer.reduce((sum, row) => sum + row.totalPrs, 0);

  if (total === 0) {
    return null;
  }

  const top = [...input.prsByReviewer].sort(
    (left, right) => right.totalPrs - left.totalPrs,
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = share(top.totalPrs, total);

  if (topShare === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    topShare,
    INSIGHT_THRESHOLDS.reviewerLoadShare,
  );
  const concentrated = severity !== "positive";

  return {
    action: concentrated
      ? "Involve more reviewers in infrastructure pull requests."
      : undefined,
    category: "risk",
    detail: `${top.reviewer} handles ${formatPercent(topShare)} of the IaC pull requests in the period.`,
    id: "iac-reviewer-load",
    severity,
    title: concentrated
      ? "Reviewer load concentrated"
      : "Reviewer load well distributed",
    value: { current: topShare * 100, unit: "%" },
  };
};

const leadTimeSpreadInsight = (input: IacInsightsInput): Insight | null => {
  const { p50, p95 } = input.leadTimePercentiles ?? {};

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

  return {
    category: "velocity",
    detail: `The median IaC PR merges in ${formatNumber(p50)} days, while the slowest 5% exceed ${formatNumber(p95)} days${formatSpreadRatio(ratio)}.`,
    id: "iac-lead-time-spread",
    severity,
    title:
      severity === "positive"
        ? "IaC lead-time spread contained"
        : "IaC lead-time spread",
    value: { current: p95, label: "95th percentile", unit: "days" },
  };
};

/** Builds the ordered list of insights for the IaC dashboard. */
export const buildIacInsights = (input: IacInsightsInput): Insight[] =>
  sortInsights(
    [
      supervisionInsight(input),
      leadTimeTrendInsight(input),
      leadTimeSpreadInsight(input),
      reviewerLoadInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
