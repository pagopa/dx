---
"dx-metrics": minor
---

Rework the dashboards for trustworthiness and readability:

- Add deterministic insights (sample size, confidence, severity) to every dashboard and aggregate them into a single Executive Summary landing page, served by one server-side endpoint instead of nine browser fetches.
- Add a cross-repository Benchmark dashboard with percentile ranking and median reference lines.
- Count only human reviews by someone other than the author in review timing, compare lead time with the preceding equally-sized window, and exclude CI-tooling workflows from workflow metrics.
- Rank bar charts by value, show units on axes and tooltips, format dates by browser locale, and surface data freshness, loading skeletons, and low-confidence insights.
- Track techradar adoption over time with an append-only snapshot table captured on each import.

Requires a schema migration (`drizzle-kit push`): the new `tech_radar_snapshots` table and additional indexes on pull requests, workflow runs, commits, and reviews.
