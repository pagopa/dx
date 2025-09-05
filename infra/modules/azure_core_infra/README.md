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

| Name                                                               | Version           |
| ------------------------------------------------------------------ | ----------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~>4               |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | >= 0.0.6, < 1.0.0 |

## Modules

| Name                                                                                            | Source                           | Version |
| ----------------------------------------------------------------------------------------------- | -------------------------------- | ------- |
| <a name="module_application_insights"></a> [application_insights](#module_application_insights) | ./\_modules/application_insights | n/a     |
| <a name="module_common_log_analytics"></a> [common_log_analytics](#module_common_log_analytics) | ./\_modules/log_analytics        | n/a     |
| <a name="module_dns"></a> [dns](#module_dns)                                                    | ./\_modules/dns                  | n/a     |
| <a name="module_github_runner"></a> [github_runner](#module_github_runner)                      | ./\_modules/github_runner        | n/a     |
| <a name="module_key_vault"></a> [key_vault](#module_key_vault)                                  | ./\_modules/key_vault            | n/a     |
| <a name="module_nat_gateway"></a> [nat_gateway](#module_nat_gateway)                            | ./\_modules/nat_gateway          | n/a     |
| <a name="module_network"></a> [network](#module_network)                                        | ./\_modules/networking           | n/a     |
| <a name="module_vpn"></a> [vpn](#module_vpn)                                                    | ./\_modules/vpn                  | n/a     |

## Resources

| Name                                                                                                                               | Type        |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_resource_group.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)    | resource    |
| [azurerm_resource_group.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource    |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)   | resource    |
| [azurerm_resource_group.opex](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)      | resource    |
| [azurerm_resource_group.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)      | resource    |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config)  | data source |

## Inputs

| Name                                                                                          | Description                                                                                                                                                                                            | Type                                                                                                                                                                                | Default         | Required |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | :------: |
| <a name="input_aws_vpn_enabled"></a> [aws_vpn_enabled](#input_aws_vpn_enabled)                | A boolean flag to enable or disable the creation of the required resources to support a site-to-site VPN connection towards AWS.                                                                       | `bool`                                                                                                                                                                              | `false`         |    no    |
| <a name="input_environment"></a> [environment](#input_environment)                            | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = optional(string)<br/> app_name = string<br/> instance_number = string<br/> })</pre> | n/a             |   yes    |
| <a name="input_nat_enabled"></a> [nat_enabled](#input_nat_enabled)                            | A boolean flag to enable or disable the creation of a NAT gateway.                                                                                                                                     | `bool`                                                                                                                                                                              | `false`         |    no    |
| <a name="input_tags"></a> [tags](#input_tags)                                                 | A map of tags to assign to the resources.                                                                                                                                                              | `map(any)`                                                                                                                                                                          | n/a             |   yes    |
| <a name="input_test_enabled"></a> [test_enabled](#input_test_enabled)                         | A boolean flag to enable or disable the creation of testing resources.                                                                                                                                 | `bool`                                                                                                                                                                              | `false`         |    no    |
| <a name="input_virtual_network_cidr"></a> [virtual_network_cidr](#input_virtual_network_cidr) | The CIDR block defining the IP address range for the virtual network.                                                                                                                                  | `string`                                                                                                                                                                            | `"10.0.0.0/16"` |    no    |
| <a name="input_vpn_enabled"></a> [vpn_enabled](#input_vpn_enabled)                            | A boolean flag to enable or disable the creation of a VPN.                                                                                                                                             | `bool`                                                                                                                                                                              | `false`         |    no    |
| <a name="input_vpn_use_case"></a> [vpn_use_case](#input_vpn_use_case)                         | Site-to-Site VPN use case. Allowed values: 'default', 'high_availability'.                                                                                                                             | `string`                                                                                                                                                                            | `"default"`     |    no    |

## Outputs

| Name                                                                                                                          | Description                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| <a name="output_application_insights"></a> [application_insights](#output_application_insights)                               | Details of the Application Insights instance, including its ID, name, and instrumentation key. |
| <a name="output_common_key_vault"></a> [common_key_vault](#output_common_key_vault)                                           | Details of the common Key Vault, including its name, ID, and resource group name.              |
| <a name="output_common_log_analytics_workspace"></a> [common_log_analytics_workspace](#output_common_log_analytics_workspace) | Details of the common Log Analytics Workspace, including its ID, name, and workspace ID.       |
| <a name="output_common_nat_gateways"></a> [common_nat_gateways](#output_common_nat_gateways)                                  | A list of NAT gateways, including their IDs and names.                                         |
| <a name="output_common_pep_snet"></a> [common_pep_snet](#output_common_pep_snet)                                              | Details of the private endpoint subnet, including its name and ID.                             |
| <a name="output_common_resource_group_id"></a> [common_resource_group_id](#output_common_resource_group_id)                   | The ID of the common resource group.                                                           |
| <a name="output_common_resource_group_name"></a> [common_resource_group_name](#output_common_resource_group_name)             | The name of the common resource group.                                                         |
| <a name="output_common_test_snet"></a> [common_test_snet](#output_common_test_snet)                                           | Details of the test subnet, including its name and ID.                                         |
| <a name="output_common_vnet"></a> [common_vnet](#output_common_vnet)                                                          | Details of the common virtual network, including its name and ID.                              |
| <a name="output_common_vpn_snet"></a> [common_vpn_snet](#output_common_vpn_snet)                                              | Details of the VPN subnet, including its name and ID.                                          |
| <a name="output_github_runner"></a> [github_runner](#output_github_runner)                                                    | Details of the GitHub runner, including environment ID, resource group name, and subnet ID.    |
| <a name="output_network_resource_group_id"></a> [network_resource_group_id](#output_network_resource_group_id)                | The ID of the network resource group.                                                          |
| <a name="output_network_resource_group_name"></a> [network_resource_group_name](#output_network_resource_group_name)          | The name of the network resource group.                                                        |
| <a name="output_opex_resource_group_id"></a> [opex_resource_group_id](#output_opex_resource_group_id)                         | The ID of the OPEX resource group.                                                             |
| <a name="output_opex_resource_group_name"></a> [opex_resource_group_name](#output_opex_resource_group_name)                   | The name of the OPEX resource group.                                                           |
| <a name="output_test_resource_group_id"></a> [test_resource_group_id](#output_test_resource_group_id)                         | The ID of the test resource group (null if testing is disabled).                               |
| <a name="output_test_resource_group_name"></a> [test_resource_group_name](#output_test_resource_group_name)                   | The name of the test resource group (null if testing is disabled).                             |
| <a name="output_vpn_fqdns"></a> [vpn_fqdns](#output_vpn_fqdns)                                                                | The FQDNs for virtual network gateway.                                                         |
| <a name="output_vpn_gateway_id"></a> [vpn_gateway_id](#output_vpn_gateway_id)                                                 | The ID of the virtual network gateway.                                                         |
| <a name="output_vpn_public_ips"></a> [vpn_public_ips](#output_vpn_public_ips)                                                 | The public IP addresses associated with the virtual network gateway.                           |

<!-- END_TF_DOCS -->
