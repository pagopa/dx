---
"azure_federated_identity_with_github": major
---

Remove terraform-azurerm-v4 dependency and add variable to override default resource group

## UPGRADE TO V1

Add a reference to the current subscription:

```hcl
data "azurerm_subscription" "current" {}
```

Add the variable `subscription_id` with `data.azurerm_subscription.current.id` as value.

This new version force the recreation of all resources are Terraform addresses are changed. This action can be done safely, but remember to:

- remove lock on the existing identities
- apply the `repository` Terraform configuration to set the new Identity ids to the GitHub repository setting
