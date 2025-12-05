---
"azure_storage_account": minor
---

Enhance security and compliance for Azure Storage Account.

## Migration Guide

For existing audit storage accounts, add diagnostic settings:

```hcl
module "audit_storage" {
  source = "./modules/azure_storage_account"

  use_case = "audit"

  # NEW: Required for compliance
  diagnostic_settings = {
    enabled                    = true
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # OPTIONAL: Override default retention (default changed from 1095 to 365 days)
  audit_retention_days = 365
}
```

Infrastructure encryption only applies to new storage accounts (Azure limitation).
