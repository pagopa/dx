/**
 * Tooltip content for Pull Request Insights dashboard
 */

export const pullRequestsTooltips = {
  title:
    "Measures pull request metrics including lead time, merge rate, and collaboration patterns to assess engineering velocity and code review effectiveness.",
  avgLeadTime:
    "Average time from PR creation to merge. Measures deployment speed and identifies bottlenecks in the review process.",
  totalPrs: "Total number of pull requests created during the selected period.",
  totalComments:
    "Total comments across all PRs. Higher engagement indicates active code reviews and discussion.",
  commentsPerPr:
    "Average comments per PR. Indicates review quality and collaboration intensity.",
  leadTimeMovingAvg:
    "Weekly average lead time trend. Shows velocity patterns and helps identify process improvements.",
  leadTimeTrend:
    "Lead time trend line over time. Visualizes long-term velocity improvements or regressions.",
  mergedPrs: "Number of successfully merged PRs per day. Tracks deployment throughput.",
  unmergedPrs:
    "Open pull requests not yet merged. Higher numbers may indicate review bottlenecks.",
  newPrs: "New pull requests created per day. Measures development activity level.",
  cumulatedNewPrs:
    "Cumulative count of PRs over time. Shows total throughput and long-term trends.",
  prSize:
    "Average PR size (lines of code) per week. Smaller PRs are typically reviewed faster and are lower risk.",
  prComments:
    "Average number of comments per PR by week. Indicates review activity and collaboration.",
  prSizeDistribution:
    "Distribution of PR sizes across ranges. Shows team's tendency for large or small changes.",
  slowestPrs:
    "PRs with the longest merge times. Helps identify problematic changes or review delays.",
} as const;
