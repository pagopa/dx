---
"dx-metrics": patch
---

Make dashboard data, charts, and insights more trustworthy and readable:

- Count only reviews from a human other than the pull-request author in review timing metrics (time to first review, time to merge, the review matrix, and the "merged without review" benchmark), so bot comments and self-comments no longer collapse review latency to zero.
- Unify the lead-time comparison: the card delta, the "previous" figure, and the insight all compare the selected window with the immediately preceding, equally-sized one; the fitted trend stays a chart and no longer drives the headline delta. The `pr-lead-time-trend` insight becomes `pr-lead-time-change`.
- Weight the pull-request lead-time trend by weekly PR volume, so a single-PR week cannot bend the trend line like a high-volume week.
- Mark insights as low confidence when they rest on fewer than ten observations or on a poorly fitted trend (`rSquared` below the configured minimum), and surface "low confidence" in the insights panel.
- Name the median against the lead-time target in the target insight, so a mean pulled up by a long tail is not the only framing.
- Show units on chart value axes and in tooltips, and draw target reference lines in a neutral colour instead of the alarm red.
- Drop the "within tolerance" label from the shaded target bands, keeping the band itself unlabelled.
- Add a "per day"/"per week" caption to time-series charts so a point is never read with the wrong bucket.
- Group the Pull Requests charts into Flow, Backlog, and Size & collaboration sections instead of one flat grid.
- Replace the techradar status pie chart with a sorted bar chart that is easier to compare (the DX adoption pies stay as pies).
- Add a "Show all" control to the insights panel so insights beyond the default top five are reachable.
- Show data freshness as a relative age and flag it in amber when the reference date is more than three days old.
- Show a skeleton layout while a dashboard loads instead of a spinner, avoiding a jump when content arrives.
- Cache dashboard payloads in the browser for a short window to avoid redundant re-fetches when moving between dashboards, and add a `/api/dashboards/benchmark` alias for the cross-repository endpoint.
- Share the pull-request size buckets between the SQL histogram and the "large PR" insight, and drop the unused `prCommentsBySize` query.
- Link the workflow failure-hotspot insight to the repository's Actions page.
