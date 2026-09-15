---
'dx-metrics': patch
---

Make lead-time statistics unambiguous on the Pull Requests dashboard:

- Name the statistic behind each insight headline value (for example "average" versus "95th percentile"), so percentile-based insights are no longer read as contradicting the average in the cards below.
- Show the selected time window in the insights panel header ("last N days").
- Rename the "Avg Lead Time" card to "Mean Lead Time" and show median and p95 next to the target, keeping the skewed distribution visible.
- Label the card delta as a "trend" change, since it comes from the within-period trend line rather than the headline mean.
