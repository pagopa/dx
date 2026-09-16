---
"dx-metrics": minor
"dx-metrics-import": minor
"@pagopa/dx-metrics-core": minor
---

Rework DX Metrics for trustworthiness and readability:

- `dx-metrics`: deterministic insights (sample size, confidence, severity) on every dashboard, aggregated into a single Executive Summary landing page served by one server-side endpoint; a cross-repository Benchmark dashboard; human-only review timing and equal-window lead-time comparison; ranked bar charts with units, locale-aware dates, data freshness, and loading skeletons.
- `dx-metrics-import`: capture an append-only techradar adoption snapshot after each import run.
- `@pagopa/dx-metrics-core`: add the `tech_radar_snapshots` table and new indexes on pull requests, workflow runs, commits, and reviews. Apply with `drizzle-kit push`.
