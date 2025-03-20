# DX - Azure Container App Environment

This Terraform module deploys an Azure Container App Environment along with necessary networking components.

## Features

- **Azure Container App Environment**: Deploys an Azure Container App Environment for hosting containerized applications.
- **Subnet Creation**: Creates a subnet for the container app environment if not provided.
- **Private Endpoint**: Enables secure connectivity by creating a private endpoint.
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

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa-dx/azure-naming-convention/azurerm | ~> 0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment) | resource |
| [azurerm_private_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics workspace to use for the container app environment. | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | (Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | (Optional) CIDR block to use for the subnet used for Container App Environment connectivity. Mandatory if subnet\_id is not set | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | (Optional) Set the subnet id where you want to host the Container App Environment. Mandatory if subnet\_cidr is not set | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | (Optional) Virtual network in which to create the subnet | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | <pre>{<br/>  "name": null,<br/>  "resource_group_name": null<br/>}</pre> | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
