# DX - Azure Container App Environment

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-container-app-environment/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-container-app-environment%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Container App Environment along with necessary networking components.

## Features

- **Azure Container App Environment**: Deploys an Azure Container App Environment for hosting containerized applications.
- **Flexible Ingress**: Choose between private (internal VNet only) or public ingress via the `public_network_access_enabled` variable (default: `false` — private mode).
- **VNet Integration**: Container apps can always reach internal resources (databases, services) via the infrastructure subnet, regardless of ingress mode.
- **Subnet Creation**: Creates a subnet for the container app environment if not provided.
- **Private Endpoint**: Creates a private endpoint for secure management connectivity. Created only when `public_network_access_enabled` is `false` (private mode).
- **Zone Redundancy**: Supports zone redundancy for high availability, enabled by default unless the environment is set to development.

## Usage Example

For a complete example of how to use this module, refer to the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app-environment/tree/main/examples/complete) directory.

## Troubleshooting

### Private Endpoint Deletion Timeout

When working with private endpoints (currently in preview), the `terraform destroy` process may get stuck while trying to delete the private endpoint. This happens because the private endpoint is not automatically detached from the environment, causing the operation to time out.

**Solution:**

1. Navigate to the Azure Portal.
2. Go to the specific Container App Environment.
3. Navigate to the **Networking** section.
4. Manually remove the connection between the private endpoint and the container app environment.
5. Re-run the `terraform destroy` command.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment) | resource |
| [azurerm_management_lock.cae_lock](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_management_lock.identity_lock](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_monitor_diagnostic_setting.container_app_environment](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_user_assigned_identity.cae_identity](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Diagnostic settings for Container App Environment logs and metrics. When enabled, sends diagnostics to Log Analytics workspace and/or Storage Account. | <pre>object({<br/>    enabled                    = bool<br/>    log_analytics_workspace_id = optional(string, null)<br/>    storage_account_id         = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics workspace to use for the container app environment. | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the resource group of the Virtual Network if not specified. | `string` | `null` | no |
| <a name="input_public_network_access_enabled"></a> [public\_network\_access\_enabled](#input\_public\_network\_access\_enabled) | If true, the Container App Environment exposes a public endpoint and allows internet ingress. If false (default), ingress is restricted to the internal virtual network only. Note: outbound access to internal resources (databases, etc.) is available in both cases via the infrastructure\_subnet\_id. When public\_network\_access\_enabled is true, private endpoints cannot be used. | `bool` | `false` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the Azure Resource Group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | The CIDR block for the subnet used for Container App Environment connectivity. This is required if 'subnet\_id' is not specified. | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | The ID of the subnet where the Container App Environment will be hosted. This is required if 'subnet\_cidr' is not specified. | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet designated for hosting private endpoints. Required when public\_network\_access\_enabled is false (default). | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | An object defining the virtual network where the subnet will be created. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | <pre>{<br/>  "name": null,<br/>  "resource_group_name": null<br/>}</pre> | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_default_domain"></a> [default\_domain](#output\_default\_domain) | The default domain of the Container App Environment. Used for public ingress when public\_network\_access\_enabled is true. |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Container App Environment resource. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Container App Environment resource. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Container App Environment is deployed. |
| <a name="output_static_ip_address"></a> [static\_ip\_address](#output\_static\_ip\_address) | The static public IP address of the Container App Environment. Available when public\_network\_access\_enabled is true. |
| <a name="output_user_assigned_identity"></a> [user\_assigned\_identity](#output\_user\_assigned\_identity) | Details about the user-assigned managed identity created to manage roles of the Container Apps of this Environment |
<!-- END_TF_DOCS -->
