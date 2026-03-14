/** Types for the pull-requests-review dashboard result. */

export interface PullRequestsReviewDashboard {
  readonly cards: {
    readonly avgTimeToFirstReview: null | number;
    readonly avgTimeToMerge: null | number;
  };
  readonly reviewDistribution: readonly ReviewDistributionRow[];
  readonly reviewMatrix: readonly ReviewMatrixRow[];
  readonly timeToFirstReviewTrend: readonly TimeToFirstReviewTrendRow[];
  readonly timeToMergeTrend: readonly TimeToMergeTrendRow[];
}

export interface ReviewDistributionRow {
  readonly approvals: number;
  readonly change_requests: number;
  readonly reviewer: string;
  readonly total_reviews: number;
}

export interface ReviewMatrixRow {
  readonly author: string;
  readonly review_count: number;
  readonly reviewer: string;
}

export interface TimeToFirstReviewTrendRow {
  readonly avg_hours_to_first_review: number;
  readonly week: string;
}

export interface TimeToMergeTrendRow {
  readonly avg_hours_to_merge: number;
  readonly week: string;
}
