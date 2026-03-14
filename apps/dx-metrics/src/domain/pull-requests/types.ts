/** Type definitions for the pull-request dashboard domain. */

/** PR count chart data — merged, unmerged, new, and cumulative. */
export interface PrCountData {
  readonly cumulatedNewPrs: readonly Record<string, unknown>[];
  readonly mergedPrs: readonly Record<string, unknown>[];
  readonly newPrs: readonly Record<string, unknown>[];
  readonly unmergedPrs: readonly Record<string, unknown>[];
}

/** Complete pull-request dashboard result combining all sections. */
export interface PrDashboardResult
  extends PrCountData, PrLeadTimeData, PrQualityData {
  readonly cards: PrSummaryCards;
}

/** Lead-time chart data with weekly moving average and trend line. */
export interface PrLeadTimeData {
  readonly leadTimeMovingAvg: readonly Record<string, unknown>[];
  readonly leadTimeTrend: readonly Record<string, unknown>[];
}

/** PR quality chart data — size, comments, distribution, and slowest PRs. */
export interface PrQualityData {
  readonly prComments: readonly Record<string, unknown>[];
  readonly prCommentsBySize: readonly Record<string, unknown>[];
  readonly prSize: readonly Record<string, unknown>[];
  readonly prSizeDistribution: readonly Record<string, unknown>[];
  readonly slowestPrs: readonly Record<string, unknown>[];
}

/** Summary card values displayed at the top of the PR dashboard. */
export interface PrSummaryCards {
  readonly avgLeadTime: null | number;
  readonly commentsPerPr: null | number;
  readonly totalComments: null | number;
  readonly totalPrs: null | number;
}
