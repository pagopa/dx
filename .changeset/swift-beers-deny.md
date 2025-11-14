---
"@pagopa/monorepo-generator": patch
---

Add Terraform backend when creating repository resources.
Based on the CSP selected by the user, when the repository resources, handled with Terraform, are created
the backend configuration is also set (always based on the CSP selected).
