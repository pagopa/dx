# DX - Azure App Service Exposed Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-service-exposed/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-service-exposed%2Fazurerm%2Flatest)

This module deploys an AppService with a strong opinionated configuration in terms of deployment strategy. This module is ideal when you need your AppService to remain accessible from the public internet.

## Features

- **AppService**: An AppService instance running Java or TypeScript code
- **AppService Slot**: A slot named `Staging` to test code before switching to production
- **App Service Plan**: A Linux-based Plan

## Use cases Comparison

| Use case  | Description                      | SLA    | Staging Slot | Autoscaling | Multi AZ |
| --------- | -------------------------------- | ------ | ------------ | ----------- | -------- |
| default   | Above average production tier    | 99.95% | Yes          | Max 30      | Yes      |
| high_load | High-performance production tier | 99.95% | Yes          | Max 30      | Yes      |

### Allowed Sizes

The SKU name is determined by the use case, but if you want to override it, you can set the `size` variable.
The allowed sizes are:

- P0v3
- P1v3
- P2v3

## Usage Example

For a complete example of how to use this module, refer to the [examples/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-app-service-exposed/tree/main/examples/complete) folder in the module repository.

## Diagram

![diagram](https://raw.githubusercontent.com/pagopa/dx/main/infra/modules/azure_app_service_exposed/diagram.svg)

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                                     | Version   |
| ------------------------------------------------------------------------ | --------- |
| <a name="requirement_terraform"></a> [terraform](#requirement_terraform) | >= 1.14.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm)       | ~> 4.58   |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                      | ~> 0.12   |

## Modules

No modules.

## Resources

| Name                                                                                                                                  | Type     |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [azurerm_linux_web_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app)           | resource |
| [azurerm_linux_web_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot) | resource |
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan)             | resource |

## Inputs

| Name                                                                                                                                                      | Description                                                                                                                                                                                            | Type                                                                                                                                                                                | Default     | Required |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | :------: |
| <a name="input_app_service_plan_id"></a> [app_service_plan_id](#input_app_service_plan_id)                                                                | ID of the AppService plan where the application will be hosted.                                                                                                                                        | `string`                                                                                                                                                                            | `null`      |    no    |
| <a name="input_app_settings"></a> [app_settings](#input_app_settings)                                                                                     | Application settings as a map of key-value pairs.                                                                                                                                                      | `map(string)`                                                                                                                                                                       | n/a         |   yes    |
| <a name="input_application_insights_connection_string"></a> [application_insights_connection_string](#input_application_insights_connection_string)       | Application Insights connection string.                                                                                                                                                                | `string`                                                                                                                                                                            | `null`      |    no    |
| <a name="input_application_insights_sampling_percentage"></a> [application_insights_sampling_percentage](#input_application_insights_sampling_percentage) | Sampling percentage for Application Insights. Default is 5.                                                                                                                                            | `number`                                                                                                                                                                            | `5`         |    no    |
| <a name="input_environment"></a> [environment](#input_environment)                                                                                        | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = optional(string)<br/> app_name = string<br/> instance_number = string<br/> })</pre> | n/a         |   yes    |
| <a name="input_health_check_path"></a> [health_check_path](#input_health_check_path)                                                                      | Path of the endpoint where health probe is exposed.                                                                                                                                                    | `string`                                                                                                                                                                            | n/a         |   yes    |
| <a name="input_java_version"></a> [java_version](#input_java_version)                                                                                     | Java version to use.                                                                                                                                                                                   | `string`                                                                                                                                                                            | `17`        |    no    |
| <a name="input_node_version"></a> [node_version](#input_node_version)                                                                                     | Node.js version to use. Supported versions: 22, 24.                                                                                                                                                    | `number`                                                                                                                                                                            | `22`        |    no    |
| <a name="input_resource_group_name"></a> [resource_group_name](#input_resource_group_name)                                                                | Name of the resource group where resources will be deployed.                                                                                                                                           | `string`                                                                                                                                                                            | n/a         |   yes    |
| <a name="input_size"></a> [size](#input_size)                                                                                                             | App Service Plan size. Allowed values: 'P0v3', 'P1v3', 'P2v3'. If not set, it will be determined by the use_case.                                                                                      | `string`                                                                                                                                                                            | `null`      |    no    |
| <a name="input_slot_app_settings"></a> [slot_app_settings](#input_slot_app_settings)                                                                      | Application settings for the staging slot.                                                                                                                                                             | `map(string)`                                                                                                                                                                       | `{}`        |    no    |
| <a name="input_stack"></a> [stack](#input_stack)                                                                                                          | Technology stack to use. Allowed values: 'node', 'java'.                                                                                                                                               | `string`                                                                                                                                                                            | `"node"`    |    no    |
| <a name="input_sticky_app_setting_names"></a> [sticky_app_setting_names](#input_sticky_app_setting_names)                                                 | List of application setting names that are not swapped between slots.                                                                                                                                  | `list(string)`                                                                                                                                                                      | `[]`        |    no    |
| <a name="input_tags"></a> [tags](#input_tags)                                                                                                             | Map of tags to apply to all created resources.                                                                                                                                                         | `map(any)`                                                                                                                                                                          | n/a         |   yes    |
| <a name="input_tls_version"></a> [tls_version](#input_tls_version)                                                                                        | Minimum TLS version for the App Service.                                                                                                                                                               | `number`                                                                                                                                                                            | `1.2`       |    no    |
| <a name="input_use_case"></a> [use_case](#input_use_case)                                                                                                 | App Service use case. Allowed values: 'default', 'high_load'.                                                                                                                                          | `string`                                                                                                                                                                            | `"default"` |    no    |

## Outputs

| Name                                                                 | Description                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| <a name="output_app_service"></a> [app_service](#output_app_service) | Details of the App Service, including its resource group, plan, and slot information. |

<!-- END_TF_DOCS -->
