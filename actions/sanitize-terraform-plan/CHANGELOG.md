## 0.1.0 (2026-05-05)

### 🚀 Features

- - Fix action: it now also filters the Terraform `changes` output (e.g. [REDACTED] -> [REDACTED]) ([#1636](https://github.com/pagopa/dx/pull/1636))
  - Add `plan-file` input to save the plan output for later use by terraform apply
  - rename the action to "sanitize" instead of "filter"

### ❤️ Thank You

- Andrea Grillo
- Copilot @Copilot
- Mario Mupo @mamu0

## 0.0.2

### Patch Changes

- 8569641: Fix, now the sensitive-key passed as input checks whether the value is contained in the key; it no longer performs an exact match.

## 0.0.1

### Patch Changes

- c293615: First release of the GitHub Action: runs terraform plan, masks sensitive values, and removes unnecessary lines to reduce the final output size.
