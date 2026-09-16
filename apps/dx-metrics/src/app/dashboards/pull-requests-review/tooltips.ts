/**
 * Tooltip content for Pull Requests Review dashboard
 */

export const pullRequestsReviewTooltips = {
  approvals:
    "Number of PRs approved by reviewer. Measures productivity and code quality sign-offs.",
  authorReviewerMatrix:
    "Who reviews whom across the team. Reveals code ownership patterns and knowledge distribution.",
  avgTimeToFirstReview:
    "Average time to first review. Indicates how quickly code reviews are initiated.",
  commentsPerPr:
    "Average comments per pull request opened in the selected period (conversation and review comments, bots included). Indicates review quality and collaboration intensity.",
  mergedWithoutCommentsShare:
    "Percentage of merged pull requests with no comments at all (from anyone, bots included). Indicates changes that shipped without any discussion.",
  changeRequests:
    "Number of change requests by reviewer. Reflects code quality standards and thoroughness.",
  reviewerStats:
    "Summary table of review activity. Identifies hotspots and reviewer expertise areas.",
  reviewsPerReviewer:
    "Count of reviews by reviewer. Helps identify key reviewers and workload balance.",
  timeToFirstReviewTrend:
    "Weekly trend of review response time. Shows if teams are responding faster to PRs.",
  timeToMergeTrend:
    "Weekly trend of merge time after approval. Identifies automation or process delays.",
  title:
    "Analyzes pull request review metrics including reviewer activity, approval times, and review distribution patterns.",
  totalComments:
    "Total comments (conversation and review) recorded on the pull requests opened in the selected period. GitHub data is stored as a per-PR total with no per-comment author or date, so bot comments cannot be separated and the count is attributed to the period the pull request was opened.",
} as const;
