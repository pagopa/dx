---
"azure_core_values_exporter": patch
---

Added subscription_id and tenant_id outputs to the module

# How to use these values

These values can be used to configure other Azure resources that require subscription or tenant IDs.

1. Remove from your configuration:
   ```hcl
   data "azurerm_subscription" "current" {}
   ```
   or
   ```hcl
   data "azurerm_client_config" "current" {}
   ```
2. Replace:

```hcl
subscription_id = data.azurerm_subscription.current.id
tenant_id       = data.azurerm_client_config.current.tenant_id
```

with:

```hcl
subscription_id = module.<exporter>.subscription_id
tenant_id       = module.<exporter>.tenant_id
```
