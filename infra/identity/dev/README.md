# DX - GitHub federated Managed Identities

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.26.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_federated_identities"></a> [federated\_identities](#module\_federated\_identities) | ../../modules/azure_federated_identity_with_github | n/a |
| <a name="module_roles_cd"></a> [roles\_cd](#module\_roles\_cd) | ../../modules/azure_role_assignments | n/a |
| <a name="module_roles_ci"></a> [roles\_ci](#module\_roles\_ci) | ../../modules/azure_role_assignments | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.rg_identity](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_key_vault.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_federated_cd_identity"></a> [federated\_cd\_identity](#output\_federated\_cd\_identity) | n/a |
| <a name="output_federated_ci_identity"></a> [federated\_ci\_identity](#output\_federated\_ci\_identity) | n/a |
<!-- END_TF_DOCS -->
