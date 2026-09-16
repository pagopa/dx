/**
 * Tooltip content for Pull Request Insights dashboard
 */

export const pullRequestsTooltips = {
  avgLeadTime:
    "Arithmetic mean of lead time (merge minus creation) across PRs merged in the selected period. Each PR counts once, so a few very slow PRs raise it above the median. The delta describes the within-period trend line, not the mean itself, so it always matches the trend chart.",
  commentsPerPr:
    "Average comments per PR. Indicates review quality and collaboration intensity.",
  contributors:
    "Number of distinct authors of the pull requests created during the selected period. Shows how many people contribute code, independently of review activity.",
  cumulatedNewPrs:
    "Cumulative count of PRs over time. Shows total throughput and long-term trends.",
  leadTimeMovingAvg:
    "Unweighted mean lead time of the PRs merged in each week, with the target as reference line. Each week counts as one point regardless of how many PRs it contains, so low-volume weeks swing more.",
  leadTimeTrend:
    "Least-squares line fitted on the weekly mean lead times (one point per week). The card delta is the change between its endpoints, so card and chart cannot point in opposite directions. Endpoints are fitted values, not actual weekly means.",
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
  prSizeLeadTime:
    "Average lead time per size bucket (merged PRs only). Shows whether larger changes wait longer before merging; buckets without merged PRs are omitted.",
  slowestPrs:
    "PRs with the longest merge times. Helps identify problematic changes or review delays.",
  title:
    "Measures pull request metrics including lead time, merge rate, and collaboration patterns to assess engineering velocity and code review effectiveness.",
  totalPrs: "Total number of pull requests created during the selected period.",
  unmergedPrs:
    "Pull requests that are open and have never been merged, counted per day over the selected period. The period sets the time axis, not the population: PRs created earlier and still open are included. PRs merged during the period are not shown as open on those days. Higher numbers may indicate review bottlenecks.",
} as const;
