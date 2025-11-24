# DX - Azure App Configuration

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-configuration/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-configuration%2Fazurerm%2Flatest)

This module deploys an Azure App Configuration, opinionated setup in terms of networking setup and access mode.

## Features

- **App Configuration**: An Azure App Configuration instance to retrieve application settings, secrets and feature flags
- **Private Endpoint**: To allow only private incoming connections

## Use cases Comparison

| Use case  | Description                      | SLA    | Guaranteed Throughput           | Request Quota   | Soft Delete | Geo Replication |
| --------- | -------------------------------- | ------ | ------------------------------- | --------------- | ----------- | --------------- |
| default   | Tier for production workfloads   | 99.95% | 300 RPS (read) - 60 RPS (write) | 30.000 per hour | Yes         | Yes             |
| developer | High-performance production tier | -      | -                               | 6.000 per hour  | No          | No              |

### Allowed Sizes

The SKU name is determined by the use case, but if you want to override it, you can set the `size` variable when `use_case` is set to `default`.
The allowed sizes are:

- `standard`
- `premium`

## Usage Example

For examples of how to use this module, refer to the [examples](https://github.com/pagopa-dx/terraform-azurerm-azure-app-configuration/tree/main/examples) folder in the module repository.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_pagopa-dx"></a> [pagopa-dx](#requirement\_pagopa-dx) | ~> 0.8 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_roles"></a> [roles](#module\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.3 |

## Resources

| Name | Type |
|------|------|
| [azurerm_app_configuration.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_configuration) | resource |
| [azurerm_private_endpoint.app_config](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.appconfig](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | Optionally, integrate App Configuration with an existing Key Vault for storing secrets. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    has_rbac_support    = bool<br/>    subscription_id     = string<br/>  })</pre> | `null` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_size"></a> [size](#input\_size) | "App Configuration SKU. Allowed values: 'standard', 'premium'. If not set, it will be determined by the use\_case." | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet hosting private endpoints. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Allowed values: 'default', 'development'. | `string` | `"default"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network where the subnet will be created. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint"></a> [endpoint](#output\_endpoint) | The service endpoint URL |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Azure Cosmos DB account. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Azure Cosmos DB account. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The system-assigned managed identity pricipal id |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group containing the Azure Cosmos DB account. |
<!-- END_TF_DOCS -->
