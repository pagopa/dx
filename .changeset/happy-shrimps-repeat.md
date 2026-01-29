---
"azure_cdn": minor
---

Add support for existing CDN profiles, WAF policies, and managed identity for origins

- Add `existing_cdn_frontdoor_profile_id` variable to reuse existing profiles
- Add `waf_enabled` variable to create and attach WAF firewall policies
- Add `use_managed_identity` and `storage_account_id` fields to origins for managed identity authentication with automatic RBAC assignment. **Note:** This feature is currently in preview and disabled by validation. It will be enabled once the feature becomes generally available. See [Azure documentation](https://learn.microsoft.com/en-us/azure/frontdoor/origin-authentication-with-managed-identities) for more information.
