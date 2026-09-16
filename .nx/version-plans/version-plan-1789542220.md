---
"dx-metrics": minor
---

Improve dashboard clarity and data legibility:

- Ranked bar charts (pipeline failures, durations, run counts, techradar
  adoption, benchmark metrics) are now sorted by value with an optional top-N,
  instead of the alphabetical order returned by the queries.
- Chart data tables and CSV exports round series values and carry the unit, so
  exports match the on-screen numbers (no more raw `3.6666666`).
- Dates follow the browser locale (SSR-safe fallback to `en-GB`); the Workflows
  locale mismatch is removed.
- The Workflows "First Run" card is correctly labelled as "First Run in Period".
- The Executive Summary passes the selected period, labels each insight with the
  dashboard it came from, and renders "last N days".
- Lead-time delta is marked favourable/unfavourable against its direction.
- The adoption pie charts now show counts alongside percentages, use a neutral
  categorical palette, and expose the data table/CSV toggle.
- The cross-repository Benchmark page gains a ranked bar chart with the median
  reference line per metric.
