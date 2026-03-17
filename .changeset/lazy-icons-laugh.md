---
"@pagopa/dx-savemoney": minor
---

- Fix table format removing `Unused` column
- Fix remove `tenantId` from config file and use Azure CLI context for tenant and subscription information
- New `lint` output format: linter-style report grouped by resource ID with risk icons (`✖ HIGH`, `⚠ MEDIUM`, `ℹ LOW`) and a summary line
- New `--tags` CLI option: filter analyzed resources by Azure tag `key=value` pairs (AND logic, e.g. `env=prod,team=dx`)
- Convert confiiguration file to YAML for better readability
- Add `azure` section to config file with `subscriptionIds`, `preferredLocation`, `timespanDays`
- Add new optional `thresholds` configuration section to config file for customizable analysis thresholds (CPU%, transactions/day, etc.) via `--config` input YAML file
