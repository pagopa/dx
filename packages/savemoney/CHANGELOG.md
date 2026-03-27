# @pagopa/dx-savemoney

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
