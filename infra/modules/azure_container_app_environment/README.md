# DX - Azure Container App Environment

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-container-app-environment/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-container-app-environment%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Container App Environment along with necessary networking components.

## Diagram

The following diagram illustrates the architecture and relationships between the main components of this module:

![diagram](https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/modules/azure_container_app_environment/diagram.svg)

## Features

- **Azure Container App Environment**: Deploys an Azure Container App Environment for hosting containerized applications.
- **Flexible Ingress**: Choose between private or public inbound access via `networking.public_network_access_enabled` (default: `false` — private mode).
- **VNet Integration**: Container apps can always reach internal resources (databases, services) via the infrastructure subnet, regardless of ingress mode.
- **Automatic Subnet Creation**: Creates a dedicated subnet for the Container App Environment.
- **Private Endpoint**: Creates a private endpoint for secure management connectivity. Created only when `networking.public_network_access_enabled` is `false` (private mode).
- **Zone Redundancy**: Supports zone redundancy for high availability.

## Usage Example

For a complete example of how to use this module, refer to the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app-environment/tree/main/examples/complete) directory.

## Custom Diagnostic Settings Example

The module always configures a default diagnostic setting to Log Analytics by using the `log_analytics_workspace_id` input.
If you need additional destinations (for example, Storage Account), add an extra `azurerm_monitor_diagnostic_setting` outside the module and target the managed environment using module outputs.

```hcl
resource "azurerm_monitor_diagnostic_setting" "container_app_environment_storage" {
  name               = "${module.container_app_environment.name}-storage-diagnostics"
  target_resource_id = module.container_app_environment.id

  storage_account_id = azurerm_storage_account.logs.id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

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
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.20 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.10 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment) | resource |
| [azurerm_management_lock.cae_lock](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_monitor_diagnostic_setting.cae](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [dx_available_subnet_cidr.cae_subnet](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics workspace to use for the container app environment. | `string` | n/a | yes |
| <a name="input_networking"></a> [networking](#input\_networking) | Networking configuration for the Container App Environment.<br/>- virtual\_network\_id: The Azure Resource ID of the Virtual Network where the module will create a dedicated /23 subnet.<br/>- private\_dns\_zone\_resource\_group\_name: The resource group containing the Private DNS Zone for the container app environment. If not set, the zone is looked up in the VNet's resource group.<br/>- public\_network\_access\_enabled: If true, the environment is accessible from public networks (no private endpoint or internal load balancer). Defaults to false. | <pre>object({<br/>    virtual_network_id                   = string<br/>    private_dns_zone_resource_group_name = optional(string, null)<br/>    public_network_access_enabled        = optional(bool, false)<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the Azure Resource Group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Allowed values: 'default', 'development'. | `string` | `"default"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_default_domain"></a> [default\_domain](#output\_default\_domain) | The default domain of the Container App Environment. Used for public ingress when public\_network\_access\_enabled is true. |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Container App Environment resource. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Container App Environment resource. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the Container App Environment's system-assigned managed identity. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Container App Environment is deployed. |
| <a name="output_static_ip_address"></a> [static\_ip\_address](#output\_static\_ip\_address) | The static public IP address of the Container App Environment. Available when public\_network\_access\_enabled is true. |
| <a name="output_subnet"></a> [subnet](#output\_subnet) | Details about the created subnet for the Container App Environment. |
<!-- END_TF_DOCS -->
