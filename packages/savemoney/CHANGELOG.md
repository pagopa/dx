## 0.5.0 (2026-07-16)

### 🚀 Features

- Align `AzureConfig.sources` with the decoded configuration by making it a ([#1983](https://github.com/pagopa/dx/pull/1983))
  required non-empty list. Callers constructing `AzureConfig` directly must now
  provide at least one source; `loadConfig` continues to default to
  `["advisor", "custom"]`. The supported values are available through
  `AZURE_SOURCE_VALUES`.

### ❤️ Thank You

- Mario Mupo @mamu0

## 0.4.0 (2026-07-09)

### 🚀 Features

- - Add monthly cost estimation for custom findings: VM, Managed Disk, Public IP, and empty App Service Plan resources now show their estimated monthly cost when flagged as suspected unused. ([#1826](https://github.com/pagopa/dx/pull/1826), [#1939](https://github.com/pagopa/dx/issues/1939), [#1938](https://github.com/pagopa/dx/issues/1938), [#1937](https://github.com/pagopa/dx/issues/1937))
  - Pricing data is fetched from the Azure Retail Prices API (no authentication required) and cached locally for 24 hours.
  - Lint report shows the resource cost once per resource header `(cost at risk: € X.XX/mo)`, not next to each individual finding.
  - Summary trailer now shows two separate totals: `Estimated monthly cost at risk (custom)` and `Estimated monthly savings (advisor)`.
  - Add `--no-pricing` CLI flag to disable custom cost-at-risk pricing lookups.


### 🩹 Fixes

- Separate custom cost-at-risk estimates from Advisor savings and wire pricing enrichment into Azure analyzers. ([#1826](https://github.com/pagopa/dx/pull/1826), [#1939](https://github.com/pagopa/dx/issues/1939), [#1938](https://github.com/pagopa/dx/issues/1938), [#1937](https://github.com/pagopa/dx/issues/1937))
- Introduce the internal Azure Retail Prices pricing module used by SaveMoney to estimate monthly cost-at-risk for custom findings, helping users prioritize unused resources with an approximate list-price impact. ([#1826](https://github.com/pagopa/dx/pull/1826), [#1939](https://github.com/pagopa/dx/issues/1939), [#1938](https://github.com/pagopa/dx/issues/1938), [#1937](https://github.com/pagopa/dx/issues/1937))

### ❤️ Thank You

- Copilot App @Copilot
- Copilot Autofix powered by AI @Copilot
- Mario Mupo @mamu0

## 0.3.3 (2026-07-02)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.2.0

## 0.3.2 (2026-06-25)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.1.0

## 0.3.1 (2026-06-09)

### 🩹 Fixes

- Upgrade dependencies ([#1818](https://github.com/pagopa/dx/pull/1818))

### ❤️ Thank You

- Copilot @Copilot
- Danilo Spinelli @gunzip

## 0.3.0 (2026-06-04)

### 🚀 Features

- - Add Azure Advisor integration: fetches Cost recommendations and maps them to `Finding` objects with estimated monthly savings. ([#1784](https://github.com/pagopa/dx/pull/1784))
  - Add `SubscriptionAnalyzer` plugin interface for subscription-scoped analyzers.
  - `analyzeAzureResources` now returns `AzureDetailedResourceReport[]`; call `generateReport(reports, format)` separately to render output.
  - Add `azure.sources` config option to filter findings by source: `"advisor"`, `"custom"`, or both (default).
  - Lint report shows a `[source]` badge and estimated monthly savings per finding.
  - Switch to `cli-table3` for table output.

### ❤️ Thank You

- Danilo Spinelli @gunzip
- Mario Mupo @mamu0

## 0.2.6 (2026-05-25)

### 🩹 Fixes

- Impact-free refactoring to prepare SaveMoney for future implementations: ([#1775](https://github.com/pagopa/dx/pull/1775))

  - Unified Finding model + adapter
  - Interface wrapping existing analyzers
  - Limiter
  - In-memory cache
  - Rewritten orchestrator (switch replaced by a registry, parallel loop)

### ❤️ Thank You

- Mario Mupo @mamu0

## 0.2.5 (2026-05-05)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.4

## 0.2.4 (2026-04-17)

### 🩹 Fixes

- Upgrade dependencies ([#1639](https://github.com/pagopa/dx/pull/1639))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3

### ❤️ Thank You

- Marco Comi @kin0992

## 0.2.3 (2026-04-01)

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.2

## 0.2.2

### Patch Changes

- f74034d: Move dependencies to the catalog

## 0.2.1

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)

## 0.2.0

### Minor Changes

- d547c62: - Fix table format removing `Unused` column
  - Fix remove `tenantId` from config file and use Azure CLI context for tenant and subscription information
  - New `lint` output format: linter-style report grouped by resource ID with risk icons (`✖ HIGH`, `⚠ MEDIUM`, `ℹ LOW`) and a summary line
  - New `--tags` CLI option: filter analyzed resources by Azure tag `key=value` pairs (AND logic, e.g. `env=prod,team=dx`)
  - Convert confiiguration file to YAML for better readability
  - Add `azure` section to config file with `subscriptionIds`, `preferredLocation`, `timespanDays`
  - Add new optional `thresholds` configuration section to config file for customizable analysis thresholds (CPU%, transactions/day, etc.) via `--config` input YAML file

## 0.1.6

### Patch Changes

- e0a3767: Upgrade dependencies

## 0.1.5

### Patch Changes

- 2d3d8fb: Update tsconfig base

## 0.1.4

### Patch Changes

- 9d4109c: Upgrade dependencies

## 0.1.3

### Patch Changes

- cfb975f: Update SaveMoney Tool with Static Web App resource control

## 0.1.2

### Patch Changes

- ccc9ff1: Add Container App control in azure resources, fixed metric retrieve method, update README

## 0.1.1

### Patch Changes

- 841df11: Let the package be public

## 0.1.0

### Minor Changes

- d8e47d0: Add a new FinOps tool for Azure that checks all resources in the subscriptions and identifies unused or underutilized resources for cost optimization opportunities
