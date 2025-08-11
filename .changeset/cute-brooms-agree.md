---
"azure_cosmos_account": major
---

Replaced the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`, `l`) have been replaced by three new options: `development` (formerly `s`), and `default` (formerly `l`). This change simplifies and clarifies the selection of Cosmos Account tiers.
