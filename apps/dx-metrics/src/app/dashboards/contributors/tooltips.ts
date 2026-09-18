/**
 * Tooltip content for the Contributors & Ownership dashboard.
 *
 * Every string frames the numbers as workload, continuity risk, and ownership
 * so the dashboard is never read as a performance ranking of individuals.
 */

export const contributorsTooltips = {
  activeContributors:
    "Distinct people who authored a pull request, reviewed, merged, or committed in the selected period. Measures how many hands are active, not how much any one person did.",
  activityTrend:
    "Pull requests merged per week alongside the number of distinct authors behind them. Shows whether throughput depends on a widening or narrowing group.",
  contributorActivity:
    "Activity per contributor merged from every source (created and merged pull requests, reviews, merges, commits). The combined activity column orders the table; it describes workload, not performance.",
  distinctMergers:
    "Distinct people who merged at least one pull request in the selected period. A wider set means merge rights are shared.",
  mergeConcentration:
    "For each repository, how many people merge and how much of the merging the busiest one performs. A high top share is a bus factor: that person's absence could stall merges in that repository.",
  mergerStats:
    "Merges and repositories per person. Ordered by merge volume to surface the bus factor, not to rank performance.",
  mergesPerMerger:
    "Top ten people by merges in the selected period. A long bar for one person relative to the rest signals concentrated merge rights.",
  mergedPrCount:
    "Human, non-draft pull requests merged in the selected period across the selected repositories.",
  ownershipByRepo:
    "Commits per repository and the single author with the most commits. A high top-author share means the repository's continuity depends on one person.",
  title:
    "Workload, merge ownership, and bus factor across the selected repositories (all of them by default). It describes load and continuity risk, not a performance ranking of individuals.",
  topContributors:
    "Top ten contributors by combined activity (merged pull requests, reviews, and commits), broken down by source. Measures where the load sits, not individual output.",
  topMergerShare:
    "Share of all merges performed by the busiest merger. High values are a delivery-risk signal because one person's absence can stall every merge.",
} as const;
