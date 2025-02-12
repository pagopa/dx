# setup

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | ~>2 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |
| <a name="requirement_github"></a> [github](#requirement\_github) | ~>6 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azuread_group.admins](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.developers](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.externals](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_container_app_environment.runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/container_app_environment) | data source |
| [azurerm_resource_group.dashboards](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_resource_group.external](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |
| [azurerm_virtual_network.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dns_zone_resource_group_id"></a> [dns\_zone\_resource\_group\_id](#output\_dns\_zone\_resource\_group\_id) | n/a |
| <a name="output_entraid_groups"></a> [entraid\_groups](#output\_entraid\_groups) | n/a |
| <a name="output_environment"></a> [environment](#output\_environment) | n/a |
| <a name="output_github_private_runner"></a> [github\_private\_runner](#output\_github\_private\_runner) | n/a |
| <a name="output_opex_resource_group_id"></a> [opex\_resource\_group\_id](#output\_opex\_resource\_group\_id) | n/a |
| <a name="output_pep_vnet_id"></a> [pep\_vnet\_id](#output\_pep\_vnet\_id) | n/a |
| <a name="output_repository"></a> [repository](#output\_repository) | n/a |
| <a name="output_subscription_id"></a> [subscription\_id](#output\_subscription\_id) | n/a |
| <a name="output_tags"></a> [tags](#output\_tags) | n/a |
| <a name="output_tenant_id"></a> [tenant\_id](#output\_tenant\_id) | n/a |
| <a name="output_terraform_storage_account"></a> [terraform\_storage\_account](#output\_terraform\_storage\_account) | n/a |
<!-- END_TF_DOCS -->
