---
"azure_federated_identity_with_github": major
---

Remove terraform-azurerm-v4 dependency and add variable to override default resource group

## UPGRADE NOTES

1) Add a reference to the current subscription:

```hcl
data "azurerm_subscription" "current" {}
```

Add the variable `subscription_id` with `data.azurerm_subscription.current.id` as value.

2) Set the new `environment` variable as follows:

- `prefix` as previous `var.prefix`
- `env_short` as previous `env_short`
- `location` with Azure region. Preferably use `italynorth`
- `domain` domain of your team
- `app_name` with the name of your app
- `instance_number` with the current enumeration, generally `01`

3) Set the new `identity_type` variable with one value between `infra`, `opex` and `app` - according go the scope of the variables already in use

4) Set `resource_group_name` with your resource group

5) The variable `repositories` becomes `repository`, an object with `owner` (defaulting to `pagopa`) and `name` as properties

6) Rename GitHub environments from `prod-ci` and `prod-cd` to `infra-prod-ci` and `infra-prod-cd` in:

- `repository` Terraform configuration
- GitHub workflows, by adding the property `override_github_environment` with value `infra-prod`

### Notes:

This new version force the recreation of all resources as Terraform addresses are changed. This action can be done safely, but remember to remove lock on the existing identities.
