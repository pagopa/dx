/**
 * Tooltip content for the Review & Collaboration dashboard
 */

export const collaborationTooltips = {
  authorReviewerMatrix:
    "Who reviews whom, with self-reviews removed. Reveals collaboration paths and knowledge distribution across repositories.",
  awaitingReview:
    "Open pull requests with no human approval yet. The breakdown shows how many have already waited longer than the first-review target.",
  awaitingReviewTable:
    "The oldest open pull requests still waiting for a first human approval, linked to GitHub. Review decision is GitHub's recorded status, when present.",
  avgTimeToFirstReview:
    "Average time to the first human review across the selected repositories, for pull requests created in the selected period.",
  reviewerBehaviour:
    "Reviews split by whether the reviewer also authored the pull request. \"On own PRs\" counts self-comments: GitHub does not allow approving your own PR, so these are never approvals.",
  reviewerLoad:
    "Total human reviews per reviewer, busiest first. Shows how review work is distributed.",
  reviewerStats:
    "Per-reviewer review activity broken down by outcome. Identifies hotspots and reviewer workload.",
  selfReviewShare:
    "Share of all reviews that were written by the author on their own pull request. These are self-comments, not approvals: GitHub blocks approving your own PR.",
  timeToFirstReviewTrend:
    "Weekly trend of the average time to first human review across the selected repositories.",
  title:
    "Cross-repository view of review and collaboration dynamics: how quickly pull requests get their first review, how concentrated review work is, and where the review queue is backing up.",
  topReviewerShare:
    "Share of all human reviews performed by the busiest reviewer. A high value is a dependency risk: one person's absence can stall reviews.",
} as const;
