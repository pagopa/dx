# network_access

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.8 |
| <a name="requirement_random"></a> [random](#requirement\_random) | ~> 3.7 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_integration_github_roles"></a> [integration\_github\_roles](#module\_integration\_github\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |
| <a name="module_private_appcs"></a> [private\_appcs](#module\_private\_appcs) | pagopa-dx/azure-app-configuration/azurerm | ~> 0.0 |
| <a name="module_role_appcs_private"></a> [role\_appcs\_private](#module\_role\_appcs\_private) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |
| <a name="module_role_appcs_public"></a> [role\_appcs\_public](#module\_role\_appcs\_public) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_app_configuration_key.test_setting](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_configuration_key) | resource |
| [azurerm_container_group.private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group) | resource |
| [azurerm_container_group.public_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group) | resource |
| [azurerm_resource_group.e2e_appcs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.private_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [dx_available_subnet_cidr.private_app](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [random_integer.appcs_instance](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_log_analytics_workspace.e2e](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/log_analytics_workspace) | data source |
| [azurerm_private_dns_zone.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |
| [azurerm_user_assigned_identity.integration_github](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/user_assigned_identity) | data source |
| [azurerm_virtual_network.e2e](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_private_app_ip_address"></a> [private\_app\_ip\_address](#output\_private\_app\_ip\_address) | n/a |
| <a name="output_public_app_ip_address"></a> [public\_app\_ip\_address](#output\_public\_app\_ip\_address) | n/a |
<!-- END_TF_DOCS -->
