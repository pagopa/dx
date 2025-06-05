---
"azure_cdn": minor
---

Added `rule_set_id` output that exposes the Front Door Rule Set ID. This allows users to implement custom rules via the `azurerm_cdn_frontdoor_rule` resource and link them to the rule set provided by the module.
