/**
 * Tooltip content for Pull Request Insights dashboard
 */

export const pullRequestsTooltips = {
  avgLeadTime:
    "Arithmetic mean of lead time (merge minus creation) across PRs merged in the selected period. Each PR counts once, so a few very slow PRs raise it above the median. The delta describes the within-period trend line, not the mean itself, so it always matches the trend chart.",
  avgTimeToMerge:
    "Average time from the last human approval to merge, for pull requests merged in the selected period. Measures how long a PR waits after being approved; lower is better.",
  closedUnmerged:
    "Pull requests that were closed without being merged during the selected period. Excludes drafts and bots. A high number can indicate rejected work or PRs abandoned before merge.",
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
  openPrsNow:
    "Pull requests that are still open at the reference date and were never merged. A point-in-time snapshot, unlike the 'Open Pull Requests (never merged)' chart which counts open PRs on each day.",
  prComments:
    "Average number of comments per PR by week. Indicates review activity and collaboration.",
  prSize:
    "Average PR size (lines of code) per week. Smaller PRs are typically reviewed faster and are lower risk.",
  prSizeDistribution:
    "Distribution of PR sizes across ranges. Shows team's tendency for large or small changes.",
  prSizeLeadTime:
    "Average lead time per size bucket (merged PRs only). Shows whether larger changes wait longer before merging; buckets without merged PRs are omitted.",
  prsByContributor:
    "Number of pull requests created per author in the selected period. Uses the same population as the Total PRs and Contributors cards (human, non-draft PRs created in the window), so the counts add up to Total PRs and the number of rows matches the Contributors card. Bots are excluded.",
  slowestPrs:
    "PRs with the longest merge times. Helps identify problematic changes or review delays.",
  staleOpenPrs:
    "Open pull requests with no recorded activity (comment, push, review) for longer than the stale target. These are candidates to nudge or close, and are the ones the 'Stale open pull requests' insight reports.",
  stalePrs:
    "Open pull requests with no recorded activity for longer than the stale target, most idle first. Each row links to the pull request on GitHub. 'Last activity' is the last update recorded for the PR.",
  title:
    "Measures pull request metrics including lead time, merge rate, and collaboration patterns to assess engineering velocity and code review effectiveness.",
  totalPrs: "Total number of pull requests created during the selected period.",
  unmergedPrs:
    "Pull requests that are open and have never been merged, counted per day over the selected period. The period sets the time axis, not the population: PRs created earlier and still open are included. PRs merged during the period are not shown as open on those days. Higher numbers may indicate review bottlenecks.",
} as const;
