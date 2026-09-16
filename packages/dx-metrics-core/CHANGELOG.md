## 0.1.8 (2026-09-16)

### 🚀 Features

- Rework DX Metrics for trustworthiness and readability: ([#2205](https://github.com/pagopa/dx/pull/2205))

  - `dx-metrics`: deterministic insights (sample size, confidence, severity) on every dashboard, aggregated into a single Executive Summary landing page served by one server-side endpoint; a cross-repository Benchmark dashboard; human-only review timing and equal-window lead-time comparison; ranked bar charts with units, locale-aware dates, data freshness, and loading skeletons.
  - `dx-metrics-import`: capture an append-only techradar adoption snapshot after each import run.
  - `@pagopa/dx-metrics-core`: add the `tech_radar_snapshots` table and new indexes on pull requests, workflow runs, commits, and reviews. Apply with `drizzle-kit push`.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.7 (2026-09-01)

### 🩹 Fixes

- Upgrade dependencies ([#2080](https://github.com/pagopa/dx/pull/2080))
- Upgrade TypeScript dependencies. ([#2080](https://github.com/pagopa/dx/pull/2080))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.2.3

### ❤️ Thank You

- Marco Comi @kin0992

## 0.1.6 (2026-07-28)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.2.2

## 0.1.4 (2026-07-02)

### 🩹 Fixes

- Upgrade JavaScript dependencies (minor and patch updates) ([#1917](https://github.com/pagopa/dx/pull/1917))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.2.0

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.1.3 (2026-06-25)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.1.0

## 0.1.2 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))
- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.1.1 (2026-05-19)

### 🩹 Fixes

- Extract shared DX Metrics schema and database contracts ([#1750](https://github.com/pagopa/dx/pull/1750))

### ❤️ Thank You

- Copilot @Copilot
- Copilot Autofix powered by AI @Copilot
- Danilo Spinelli @gunzip
