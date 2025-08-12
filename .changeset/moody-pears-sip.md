---
"azure_storage_account": major
---

Replace the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`, `l`) have been replaced by five new options: `development` (formerly `s`), `default` (formerly `l`),  `audit`, `delegated_access` and `archive`. This change simplifies and clarifies the selection of Storage Account.
- The `audit` use case now requires Customer-Managed Key (BYOK) encryption to be enabled.
- For the `delegated_access` use case, `shared_access_key_enabled` is now set to false.
- Microsoft Defender for Storage (`advanced_threat_protection`) is now consistently enabled for use cases exposed to higher risks, such as `delegated_access`.