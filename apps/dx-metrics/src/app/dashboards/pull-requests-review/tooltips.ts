/**
 * Tooltip content for Pull Requests Review dashboard
 */

export const pullRequestsReviewTooltips = {
  title:
    "Analyzes pull request review metrics including reviewer activity, approval times, and review distribution patterns.",
  avgTimeToFirstReview:
    "Average time to first review. Indicates how quickly code reviews are initiated.",
  avgTimeToMerge: "Average time to merge after approval. Indicates workflow automation efficiency.",
  timeToFirstReviewTrend:
    "Weekly trend of review response time. Shows if teams are responding faster to PRs.",
  timeToMergeTrend:
    "Weekly trend of merge time after approval. Identifies automation or process delays.",
  reviewsPerReviewer: "Count of reviews by reviewer. Helps identify key reviewers and workload balance.",
  approvals: "Number of PRs approved by reviewer. Measures productivity and code quality sign-offs.",
  changeRequests:
    "Number of change requests by reviewer. Reflects code quality standards and thoroughness.",
  reviewerStats:
    "Summary table of review activity. Identifies hotspots and reviewer expertise areas.",
  authorReviewerMatrix:
    "Who reviews whom across the team. Reveals code ownership patterns and knowledge distribution.",
} as const;
