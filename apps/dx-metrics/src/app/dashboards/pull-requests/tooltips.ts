/**
 * Tooltip content for Pull Request Insights dashboard
 */

export const pullRequestsTooltips = {
  avgLeadTime:
    "Average time from PR creation to merge in the selected period. The delta reflects the direction of the within-period trend line, so it always matches the trend chart.",
  commentsPerPr:
    "Average comments per PR. Indicates review quality and collaboration intensity.",
  cumulatedNewPrs:
    "Cumulative count of PRs over time. Shows total throughput and long-term trends.",
  leadTimeMovingAvg:
    "Weekly average lead time, with the target as reference line. Shows the shape of the period.",
  leadTimeTrend:
    "In-period linear regression of the weekly average lead time. The card delta is derived from its endpoints, so card and chart cannot point in opposite directions.",
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
    "Pull requests that are open and have never been merged, counted per day over the selected period. The period sets the time axis, not the population: PRs created earlier and still open are included. PRs merged during the period are not shown as open on those days. Higher numbers may indicate review bottlenecks.",
} as const;
