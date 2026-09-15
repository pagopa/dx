/** Deterministic insights for the Tracker dashboard. */

import { INSIGHT_THRESHOLDS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  formatNumber,
  formatPercent,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface TrackerInsightsInput {
  readonly byCategory: readonly {
    readonly category: string;
    readonly requests: number;
  }[];
  readonly cards: {
    readonly avgClose: null | number;
    readonly closedTotal: null | number;
    readonly openedTotal: null | number;
    readonly requestsTrend: null | number;
  };
}

const backlogInsight = (input: TrackerInsightsInput): Insight | null => {
  const { closedTotal, openedTotal } = input.cards;

  if (openedTotal === null || closedTotal === null) {
    return null;
  }

  const open = Math.max(openedTotal - closedTotal, 0);
  const openShare = share(open, openedTotal) ?? 0;
  const severity = severityFromUpperThreshold(
    openShare,
    INSIGHT_THRESHOLDS.trackerBacklogShare,
  );

  return {
    category: "quality",
    detail: `${openedTotal} requests opened and ${closedTotal} closed: ${open} still to handle.`,
    id: "tracker-backlog",
    severity,
    title: open > 0 ? "Requests still open" : "All requests handled",
    value: { current: open, unit: "requests" },
  };
};

const topCategoryInsight = (input: TrackerInsightsInput): Insight | null => {
  const total = input.byCategory.reduce((sum, row) => sum + row.requests, 0);

  if (total === 0) {
    return null;
  }

  const top = [...input.byCategory].sort(
    (left, right) => right.requests - left.requests,
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = share(top.requests, total);

  if (topShare === null) {
    return null;
  }

  return {
    category: "quality",
    detail: `The most frequent category is "${top.category}" with ${formatPercent(topShare)} of requests (${top.requests}/${total}).`,
    id: "tracker-top-category",
    severity: "neutral",
    title: "Most requested category",
    value: { current: topShare * 100, unit: "%" },
  };
};

const demandTrendInsight = (input: TrackerInsightsInput): Insight | null => {
  const trend = input.cards.requestsTrend;

  if (trend === null) {
    return null;
  }

  const direction =
    trend > 10 ? "growing" : trend < -10 ? "declining" : "stable";

  return {
    category: "quality",
    detail: `Request volume is ${direction} (${formatNumber(trend, 0)}% based on the fitted trend).`,
    id: "tracker-demand-trend",
    severity: "neutral",
    title: `Demand ${direction}`,
    value: { current: trend, unit: "%" },
  };
};

/** Builds the ordered list of insights for the Tracker dashboard. */
export const buildTrackerInsights = (input: TrackerInsightsInput): Insight[] =>
  sortInsights(
    [
      backlogInsight(input),
      topCategoryInsight(input),
      demandTrendInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
