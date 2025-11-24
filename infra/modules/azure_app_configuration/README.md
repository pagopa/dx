# DX - Azure App Configuration

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-configuration/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-configuration%2Fazurerm%2Flatest)

This module deploys an Azure App Configuration, opinionated setup in terms of networking setup and access mode.

## Features

- **App Configuration**: An Azure App Configuration instance to retrieve application settings, secrets and feature flags
- **Private Endpoint**: To allow only private incoming connections

## Use cases Comparison

| Use case  | Description                                       | SLA    | Guaranteed Throughput           | Request Quota   | Soft Delete | Geo Replication |
| --------- | ------------------------------------------------- | ------ | ------------------------------- | --------------- | ----------- | --------------- |
| default   | Tier for production workfloads                    | 99.95% | 300 RPS (read) - 60 RPS (write) | 30.000 per hour | Yes         | Yes             |
| developer | Tier for experimentation or development scenarios | -      | -                               | 6.000 per hour  | No          | No              |

### Allowed Sizes

The SKU name is determined by the use case, but if you want to override it, you can set the `size` variable when `use_case` is set to `default`.
The allowed sizes are:

- `standard`
- `premium`

## Usage Example

For examples of how to use this module, refer to the [examples](https://github.com/pagopa-dx/terraform-azurerm-azure-app-configuration/tree/main/examples) folder in the module repository.

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                                     | Version |
| ------------------------------------------------------------------------ | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm)       | ~> 4.0  |
| <a name="requirement_pagopa-dx"></a> [pagopa-dx](#requirement_pagopa-dx) | ~> 0.8  |

## Modules

| Name                                                                                            | Source                                   | Version |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------- | ------- |
| <a name="module_app_roles"></a> [app_roles](#module_app_roles)                                  | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3  |
| <a name="module_appconfig_team_roles"></a> [appconfig_team_roles](#module_appconfig_team_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3  |

## Resources

| Name                                                                                                                                                               | Type        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [azurerm_app_configuration.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_configuration)                                | resource    |
| [azurerm_monitor_diagnostic_setting.app_configuration](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource    |
| [azurerm_private_endpoint.app_config](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint)                            | resource    |
| [azurerm_private_dns_zone.appconfig](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)                          | data source |

## Inputs

| Name                                                                                                                                          | Description                                                                                                                                                                                                                                                                                                   | Type                                                                                                                                                                                | Default                                                   | Required |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | :------: |
| <a name="input_authorized_teams"></a> [authorized_teams](#input_authorized_teams)                                                             | Object containing lists of principal IDs (Azure AD object IDs) of product teams to be granted read or write permissions on the App Configuration. These represent the teams within the organization that need access to this resource."                                                                       | <pre>object({<br/> writers = optional(list(string), []),<br/> readers = optional(list(string), [])<br/> })</pre>                                                                    | <pre>{<br/> "readers": [],<br/> "writers": []<br/>}</pre> |    no    |
| <a name="input_environment"></a> [environment](#input_environment)                                                                            | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains.                                                                                                        | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = optional(string)<br/> app_name = string<br/> instance_number = string<br/> })</pre> | n/a                                                       |   yes    |
| <a name="input_key_vaults"></a> [key_vaults](#input_key_vaults)                                                                               | Optionally, integrate App Configuration with a one or more existing Key Vault for secrets retrieval.<br/> Set `has_rbac_support` to true if the referenced Key Vault uses RBAC model for access control.<br/> Use `app_principal_ids` to set application principal IDs to be granted access to the Key Vault. | <pre>list(object({<br/> name = string<br/> resource_group_name = string<br/> has_rbac_support = bool<br/> app_principal_ids = list(string)<br/> }))</pre>                           | `null`                                                    |    no    |
| <a name="input_private_dns_zone_resource_group_name"></a> [private_dns_zone_resource_group_name](#input_private_dns_zone_resource_group_name) | Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network.                                                                                                                                                                       | `string`                                                                                                                                                                            | `null`                                                    |    no    |
| <a name="input_resource_group_name"></a> [resource_group_name](#input_resource_group_name)                                                    | The name of the resource group where resources will be deployed.                                                                                                                                                                                                                                              | `string`                                                                                                                                                                            | n/a                                                       |   yes    |
| <a name="input_size"></a> [size](#input_size)                                                                                                 | "App Configuration SKU. Allowed values: 'standard', 'premium'. If not set, it will be determined by the use_case."                                                                                                                                                                                            | `string`                                                                                                                                                                            | `null`                                                    |    no    |
| <a name="input_subnet_pep_id"></a> [subnet_pep_id](#input_subnet_pep_id)                                                                      | ID of the subnet hosting private endpoints.                                                                                                                                                                                                                                                                   | `string`                                                                                                                                                                            | n/a                                                       |   yes    |
| <a name="input_subscription_id"></a> [subscription_id](#input_subscription_id)                                                                | Subscription Id of the involved resources                                                                                                                                                                                                                                                                     | `string`                                                                                                                                                                            | n/a                                                       |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                                                                                                 | A map of tags to assign to the resources.                                                                                                                                                                                                                                                                     | `map(any)`                                                                                                                                                                          | n/a                                                       |   yes    |
| <a name="input_use_case"></a> [use_case](#input_use_case)                                                                                     | Allowed values: 'default', 'development'.                                                                                                                                                                                                                                                                     | `string`                                                                                                                                                                            | `"default"`                                               |    no    |
| <a name="input_virtual_network"></a> [virtual_network](#input_virtual_network)                                                                | Virtual network where the subnet will be created.                                                                                                                                                                                                                                                             | <pre>object({<br/> name = string<br/> resource_group_name = string<br/> })</pre>                                                                                                    | n/a                                                       |   yes    |

## Outputs

| Name                                                                                         | Description                                                            |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| <a name="output_endpoint"></a> [endpoint](#output_endpoint)                                  | The service endpoint URL                                               |
| <a name="output_id"></a> [id](#output_id)                                                    | The ID of the Azure Cosmos DB account.                                 |
| <a name="output_name"></a> [name](#output_name)                                              | The name of the Azure Cosmos DB account.                               |
| <a name="output_principal_id"></a> [principal_id](#output_principal_id)                      | The system-assigned managed identity pricipal id                       |
| <a name="output_resource_group_name"></a> [resource_group_name](#output_resource_group_name) | The name of the resource group containing the Azure Cosmos DB account. |

<!-- END_TF_DOCS -->
