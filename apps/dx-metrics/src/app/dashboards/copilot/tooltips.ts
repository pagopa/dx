/**
 * Tooltip content for Copilot dashboard
 */

export const copilotTooltips = {
  agentPrOutcome:
    "Merge rate of pull requests opened by the Copilot coding agent in the selected period. A low rate is not automatically bad (work in progress is expected), but several long-lived open agent pull requests are worth a look.",
  copilotCoauthoredCommits:
    "Commits in the selected period whose message carries a `Co-authored-by: Copilot` trailer, i.e. commits the Copilot coding agent contributed to. The card also shows this as a share of the team commits imported in the period. Two data limits keep this a floor, not a total: only commits authored by DX team members are imported, and commit messages are stored truncated to 500 characters, so a trailer on a longer message may be missing.",
  copilotLeadTime:
    "Average time from open to merge for pull requests merged in the selected period, split by whether they received a Copilot review. Copilot tends to review larger or riskier changes, so the difference is a correlation, not a proven speed-up.",
  copilotReviewCoverage:
    "Share of merged pull requests in the selected period that received at least one Copilot code review. Copilot reviews are bots, so they are excluded from the human-review metrics on the other dashboards.",
  copilotReviewedPrs:
    "Merged pull requests in the selected period with at least one Copilot code review.",
  coauthorLeadTimeTrend:
    "Two series over the selected period, both scoped to the selected repositories: bars are commits the Copilot coding agent co-authored in the week (by commit date), the line is the average open-to-merge time of PRs merged that week (in days, for merged non-draft PRs). Read it as a correlation, not causation: a week with more Copilot commits is not necessarily faster or slower, and the two series are bucketed on different event dates.",
  commitsByRepository:
    "Copilot co-authored commits in the selected period, grouped by repository. Shows where the coding agent contributes most.",
  coverageTrend:
    "Cumulative merged pull requests over the selected period, split by whether they had received a Copilot review. The two series partition the same population, so compare their slopes, or read the coverage card for the rate: the absolute gap widens whenever uncovered PRs outnumber covered ones, even when adoption is improving. The raw count is not directly comparable across repositories of different size.",
  leadTimeComparison:
    "Average open-to-merge time for merged pull requests, with versus without a Copilot review. Bars come from the same population, so they are directly comparable.",
  recentAuthoredPrs:
    "Pull requests opened by the Copilot coding agent in the selected period (most recent first). Lead time is open-to-merge for merged ones.",
  reviewCombination:
    "Merged pull requests grouped by who reviewed them: Copilot and a human, a human only, Copilot only, or nobody. `Copilot only` is the risk slice: a Copilot comment is not an approval, so those PRs shipped without a human sign-off.",
  prSizeBuckets:
    "Share of merged pull requests that received a Copilot review, split by pull-request size (lines added). Copilot is called more often on larger changes, which is why the `with Copilot` lead time is higher: selection, not slowdown. `unknown` collects PRs whose size was not imported.",
  title:
    "Measures GitHub Copilot involvement in pull requests: code reviews by the Copilot reviewer bot, pull requests opened by the Copilot coding agent, and commits the agent co-authored.",
  weeklyTrend:
    "Number of Copilot review events submitted each week in the selected period. GitHub stores one record per Copilot review (not per inline comment), so this is a review count, not a comment count.",
} as const;
