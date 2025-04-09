# DX - Azure App Service Plan Internal Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-service-plan/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-service-plan%2Fazurerm%2Flatest)

This Terraform module provisions an Azure App Service Plan with configurable tiers and zone redundancy.

> **NOTE**: This module is for internal use only.

## Features

- **Flexible Tiers**: Supports multiple tiers (`s`, `m`, `l`, `xl`) to accommodate different workload requirements.
- **Zone Redundancy**: Enables zone balancing for tiers other than `s`.
- **Linux OS Support**: Configures the App Service Plan to use Linux as the operating system.
- **Customizable Naming**: Integrates with the naming convention module for consistent resource naming.

## Tiers and Configurations

The module supports different tiers of configurations to accommodate various workload requirements. Below is a comparison of the tiers:

| Tier | Description                                                      | Zone Redundancy |
|------|------------------------------------------------------------------|-----------------|
| `s`  | Suitable for lightweight workloads, testing, and development.    | No              |
| `m`  | Ideal for moderate workloads with predictable scaling needs.     | Yes             |
| `l`  | Designed for high-demand workloads with advanced scaling needs.  | Yes             |
| `xl` | Best for enterprise-grade workloads requiring maximum resources. | Yes             |

## Usage Example

Here is an example of how to use this module to create an Azure App Service Plan:

```terraform
module "app_service_plan" {
  source              = "../../"
  
  environment         = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    app_name        = "example"
    instance_number = "01"
  }

  resource_group_name = "dx-d-itn-example-rg-01"

  tier = "s"
}
```

This example creates an App Service Plan in the `italynorth` region with a small (`s`) tier.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.7, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values used to generate resource name | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where the App Service Plan will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tier. Allowed values are 's', 'm', 'l', 'xl' | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | Id of the App Service Plan |
| <a name="output_name"></a> [name](#output\_name) | Name of the App Service Plan |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | Resource group name of the App Service Plan |
| <a name="output_sku_name"></a> [sku\_name](#output\_sku\_name) | SKU name of the App Service Plan |
| <a name="output_zone_balancing_enabled"></a> [zone\_balancing\_enabled](#output\_zone\_balancing\_enabled) | True whether the zone redundancy is enabled |
<!-- END_TF_DOCS -->
