# DX - Azure Core Infrastructure

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-core-infra/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-core-infra%2Fazurerm%2Flatest)

This Terraform module provisions the core infrastructure required for the initial configuration of an Azure subscription.

## Features

- **Virtual Network (VNet)**: Creates a virtual network with subnets for private endpoints.
- **VPN Support**: Optionally provisions a VPN with configurable settings.
- **Resource Groups**: Creates resource groups for the VNet, common resources, and testing environments.
- **Key Vault**: Deploys a common Key Vault with a private endpoint for secure storage.
- **Private DNS Zones**: Configures private DNS zones for all resource types.
- **Log Analytics Workspace**: Creates a Log Analytics Workspace for monitoring and diagnostics.
- **GitHub Runner**: Provisions a GitHub Runner for CI/CD workflows.

## Usage Example

For detailed usage examples, refer to the [examples folder](https://github.com/pagopa-dx/terraform-azurerm-azure-core-infra/tree/main/example), which includes:

- A [complete example](https://github.com/pagopa-dx/terraform-azurerm-azure-core-infra/tree/main/example/complete) that demonstrates all features and provisions the core infrastructure.
- A [develop example](https://github.com/pagopa-dx/terraform-azurerm-azure-core-infra/tree/main/example/develop) that extends the basic infrastructure with additional resources to bootstrap a development environment on Azure.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_common_log_analytics"></a> [common\_log\_analytics](#module\_common\_log\_analytics) | ./_modules/log_analytics | n/a |
| <a name="module_dns"></a> [dns](#module\_dns) | ./_modules/dns | n/a |
| <a name="module_github_runner"></a> [github\_runner](#module\_github\_runner) | ./_modules/github_runner | n/a |
| <a name="module_key_vault"></a> [key\_vault](#module\_key\_vault) | ./_modules/key_vault | n/a |
| <a name="module_nat_gateway"></a> [nat\_gateway](#module\_nat\_gateway) | ./_modules/nat_gateway | n/a |
| <a name="module_network"></a> [network](#module\_network) | ./_modules/networking | n/a |
| <a name="module_vpn"></a> [vpn](#module\_vpn) | ./_modules/vpn | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.opex](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_nat_enabled"></a> [nat\_enabled](#input\_nat\_enabled) | A boolean flag to enable or disable the creation of a NAT gateway. | `bool` | `false` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_test_enabled"></a> [test\_enabled](#input\_test\_enabled) | A boolean flag to enable or disable the creation of testing resources. | `bool` | `false` | no |
| <a name="input_virtual_network_cidr"></a> [virtual\_network\_cidr](#input\_virtual\_network\_cidr) | The CIDR block defining the IP address range for the virtual network. | `string` | `"10.0.0.0/16"` | no |
| <a name="input_vpn_enabled"></a> [vpn\_enabled](#input\_vpn\_enabled) | A boolean flag to enable or disable the creation of a VPN. | `bool` | `false` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_common_key_vault"></a> [common\_key\_vault](#output\_common\_key\_vault) | Details of the common Key Vault, including its name, ID, and resource group name. |
| <a name="output_common_log_analytics_workspace"></a> [common\_log\_analytics\_workspace](#output\_common\_log\_analytics\_workspace) | Details of the common Log Analytics Workspace, including its ID, name, and workspace ID. |
| <a name="output_common_nat_gateways"></a> [common\_nat\_gateways](#output\_common\_nat\_gateways) | A list of NAT gateways, including their IDs and names. |
| <a name="output_common_pep_snet"></a> [common\_pep\_snet](#output\_common\_pep\_snet) | Details of the private endpoint subnet, including its name and ID. |
| <a name="output_common_resource_group_id"></a> [common\_resource\_group\_id](#output\_common\_resource\_group\_id) | The ID of the common resource group. |
| <a name="output_common_resource_group_name"></a> [common\_resource\_group\_name](#output\_common\_resource\_group\_name) | The name of the common resource group. |
| <a name="output_common_test_snet"></a> [common\_test\_snet](#output\_common\_test\_snet) | Details of the test subnet, including its name and ID. |
| <a name="output_common_vnet"></a> [common\_vnet](#output\_common\_vnet) | Details of the common virtual network, including its name and ID. |
| <a name="output_github_runner"></a> [github\_runner](#output\_github\_runner) | Details of the GitHub runner, including environment ID, resource group name, and subnet ID. |
| <a name="output_network_resource_group_id"></a> [network\_resource\_group\_id](#output\_network\_resource\_group\_id) | The ID of the network resource group. |
| <a name="output_network_resource_group_name"></a> [network\_resource\_group\_name](#output\_network\_resource\_group\_name) | The name of the network resource group. |
| <a name="output_opex_resource_group_id"></a> [opex\_resource\_group\_id](#output\_opex\_resource\_group\_id) | The ID of the OPEX resource group. |
| <a name="output_opex_resource_group_name"></a> [opex\_resource\_group\_name](#output\_opex\_resource\_group\_name) | The name of the OPEX resource group. |
| <a name="output_test_resource_group_id"></a> [test\_resource\_group\_id](#output\_test\_resource\_group\_id) | The ID of the test resource group (null if testing is disabled). |
| <a name="output_test_resource_group_name"></a> [test\_resource\_group\_name](#output\_test\_resource\_group\_name) | The name of the test resource group (null if testing is disabled). |
<!-- END_TF_DOCS -->
