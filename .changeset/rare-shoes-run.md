---
"azure_api_management": major
---

Replaced the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`, `m`, `l`, `xl`) have been replaced by three new options: `development` (formerly `s`), `cost_optimized` (formerly `m`, now using StandardV2 SKU), and `high_load` (formerly `l`). This change simplifies and clarifies the selection of API Management tiers.