/** TypeScript types for the IaC dashboard result shapes. */

export interface IacDashboardResult {
  readonly leadTimeMovingAvg: readonly LeadTimeMovingAvgRow[];
  readonly leadTimeTrend: readonly LeadTimeTrendRow[];
  readonly prsByReviewer: readonly PrsByReviewerRow[];
  readonly prsOverTime: readonly PrsOverTimeRow[];
  readonly supervisedVsUnsupervised: readonly SupervisedVsUnsupervisedRow[];
}

export interface LeadTimeMovingAvgRow {
  readonly avg_lead_time_days: number;
  readonly week: string;
}

export interface LeadTimeTrendRow {
  readonly date: string;
  readonly trend_line: number;
}

export interface PrsByReviewerRow {
  readonly avg_lead_time_days: number;
  readonly merged_prs: number;
  readonly reviewer: string;
  readonly total_prs: number;
}

export interface PrsOverTimeRow {
  readonly pr_count: number;
  readonly week: string;
}

export interface SupervisedVsUnsupervisedRow {
  readonly cumulative_count: number;
  readonly pr_type: string;
  readonly run_date: string;
}
