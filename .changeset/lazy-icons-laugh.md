---
"@pagopa/dx-savemoney": minor
---

Fix table format removing `Unused` column.
Add linter-style output format, tag filtering and configurable thresholds to `savemoney`.

- New `lint` output format: linter-style report grouped by resource ID with risk icons (`✖ HIGH`, `⚠ MEDIUM`, `ℹ LOW`) and a summary line
- New `--tags` CLI option: filter analyzed resources by Azure tag `key=value` pairs (AND logic, e.g. `env=prod,team=dx`)
- New `--thresholds` CLI option and cosmiconfig support: override analysis thresholds (CPU%, transactions/day, etc.) via `.savemoneyrc.json` or any cosmiconfig-compatible file, with per-field deep merge onto the built-in defaults
