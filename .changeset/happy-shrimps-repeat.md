---
"azure_cdn": minor
---

Add support for existing CDN profiles, WAF policies, and managed identity for origins

- Add `existing_cdn_frontdoor_profile_id` variable to reuse existing profiles
- Add `waf_enabled` variable to create and attach WAF firewall policies
- Add `use_managed_identity` and `storage_account_id` to origins for private storage access with automatic RBAC assignment
