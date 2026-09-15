---
'dx-metrics': patch
---

Make dashboard data, charts, and insights more trustworthy and readable:

- Count only reviews from a human other than the pull-request author in review timing metrics (time to first review, time to merge, the review matrix, and the "merged without review" benchmark), so bot comments and self-comments no longer collapse review latency to zero.
- Mark insights built on fewer than ten observations as low confidence and surface "low confidence" in the insights panel; the field existed in the contract but was never set.
- Weight the pull-request lead-time trend by weekly PR volume, so a single-PR week cannot bend the trend line like a high-volume week.
- Show units on chart value axes and in tooltips, and draw target reference lines in a neutral colour instead of the alarm red.
- Replace the part-to-whole pie charts (DX adoption, techradar status) with sorted bar charts that are easier to compare.
- Add a "Show all" control to the insights panel so insights beyond the default top five are reachable.
- Show data freshness as a relative age and flag it in amber when the reference date is more than three days old.
- Cache dashboard payloads in the browser for a short window to avoid redundant re-fetches when moving between dashboards, and add a `/api/dashboards/benchmark` alias for the cross-repository endpoint.
- Drop the unused `prCommentsBySize` query to remove a needless database scan on every pull-request request.
