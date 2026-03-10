/**
 * Tooltip content for Pull Request Insights dashboard
 */

export const pullRequestsTooltips = {
  avgLeadTime:
    "Average time from PR creation to merge. Measures deployment speed and identifies bottlenecks in the review process.",
  commentsPerPr:
    "Average comments per PR. Indicates review quality and collaboration intensity.",
  cumulatedNewPrs:
    "Cumulative count of PRs over time. Shows total throughput and long-term trends.",
  leadTimeMovingAvg:
    "Weekly average lead time trend. Shows velocity patterns and helps identify process improvements.",
  leadTimeTrend:
    "Lead time trend line over time. Visualizes long-term velocity improvements or regressions.",
  mergedPrs:
    "Number of successfully merged PRs per day. Tracks deployment throughput.",
  newPrs:
    "New pull requests created per day. Measures development activity level.",
  prComments:
    "Average number of comments per PR by week. Indicates review activity and collaboration.",
  prSize:
    "Average PR size (lines of code) per week. Smaller PRs are typically reviewed faster and are lower risk.",
  prSizeDistribution:
    "Distribution of PR sizes across ranges. Shows team's tendency for large or small changes.",
  slowestPrs:
    "PRs with the longest merge times. Helps identify problematic changes or review delays.",
  title:
    "Measures pull request metrics including lead time, merge rate, and collaboration patterns to assess engineering velocity and code review effectiveness.",
  totalComments:
    "Total comments across all PRs. Higher engagement indicates active code reviews and discussion.",
  totalPrs: "Total number of pull requests created during the selected period.",
  unmergedPrs:
    "Open pull requests not yet merged. Higher numbers may indicate review bottlenecks.",
} as const;
