# DX - Azure Function App Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-function-app/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-function-app%2Fazurerm%2Flatest)

This module deploys an Azure Function App with a strong opinionated configuration for networking, security, and deployment strategy. It is ideal for scenarios where you need your Function App to be private and securely integrated with Azure resources.

## Features

- **Function App**: Deploys a Linux-based Azure Function App supporting Node.js or Java runtimes
- **Staging Slot**: Includes a staging slot for zero-downtime deployments
- **App Service Plan**: Uses a Linux App Service Plan (can be created or reused)
- **Private Endpoints**: Ensures private connectivity for the Function App and its storage accounts
- **Subnet**: Manages subnet creation or reuse for outbound connectivity
- **Durable Functions**: Optional support for Durable Functions with dedicated storage
- **Monitoring**: Integrates with Application Insights and sets up health check alerts

## Use cases Comparison

| Use case  | Description                      | Staging Slot | Multi AZ | Worker Processes |
| --------- | -------------------------------- | ------------ | -------- | ---------------- |
| default   | Above average production tier    | Yes          | Yes      | 2                |
| high_load | High-performance production tier | Yes          | Yes      | 8                |

### Allowed Sizes

The SKU name is determined by the use case, but if you want to override it, you can set the `size` variable.
The allowed sizes are:

- P0v3
- P1v3
- P1mv3
- P2mv3
- P3mv3

## Usage Example

For a complete example, see the [examples/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-function-app/tree/main/examples/complete) folder in this repository.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.6.0, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_linux_function_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app) | resource |
| [azurerm_linux_function_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app_slot) | resource |
| [azurerm_monitor_diagnostic_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.function_app_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.storage_account_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.function_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.st_blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.st_file](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.st_queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.staging_function_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.std_blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.std_file](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.std_queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.std_table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_role_assignment.durable_function_storage_blob_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.durable_function_storage_queue_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.durable_function_storage_table_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.function_storage_account_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.function_storage_blob_data_owner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.function_storage_queue_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_durable_function_storage_blob_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_durable_function_storage_queue_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_durable_function_storage_table_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_function_storage_account_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_function_storage_blob_data_owner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.staging_function_storage_queue_data_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan) | resource |
| [azurerm_storage_account.durable_function](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_storage_account_network_rules.st_network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
| [azurerm_storage_account_network_rules.std_network_rules](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_private_dns_zone.function_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.storage_account_blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.storage_account_file](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.storage_account_queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.storage_account_table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_ids"></a> [action\_group\_ids](#input\_action\_group\_ids) | The ID of the Action Groups to invoke when an alert is triggered for the Function App. | `set(string)` | `[]` | no |
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | The ID of the App Service Plan where the Function App will be hosted. Leave null to create a new plan. | `string` | `null` | no |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | A map of application settings for the Function App. | `map(string)` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | The connection string for Application Insights to enable monitoring and diagnostics. | `string` | `null` | no |
| <a name="input_application_insights_key"></a> [application\_insights\_key](#input\_application\_insights\_key) | The instrumentation key for Application Insights to enable monitoring and diagnostics. | `string` | `null` | no |
| <a name="input_application_insights_sampling_percentage"></a> [application\_insights\_sampling\_percentage](#input\_application\_insights\_sampling\_percentage) | The sampling percentage for Application Insights telemetry. Default is 5. | `number` | `5` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br/>If enabled, specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and<br/>optionally the ID of the Storage Account where logs should be sent. | <pre>object({<br/>    enabled                                   = bool<br/>    log_analytics_workspace_id                = optional(string)<br/>    diagnostic_setting_destination_storage_id = optional(string)<br/>  })</pre> | <pre>{<br/>  "diagnostic_setting_destination_storage_id": null,<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_has_durable_functions"></a> [has\_durable\_functions](#input\_has\_durable\_functions) | Set to true if the Function App hosts Durable Functions. | `bool` | `false` | no |
| <a name="input_health_check_path"></a> [health\_check\_path](#input\_health\_check\_path) | The endpoint path where the health probe is exposed for the Function App. | `string` | n/a | yes |
| <a name="input_java_version"></a> [java\_version](#input\_java\_version) | The version of Java to use for the Function App runtime. | `string` | `17` | no |
| <a name="input_node_version"></a> [node\_version](#input\_node\_version) | The version of Node.js to use for the Function App runtime. | `number` | `20` | no |
| <a name="input_private_dns_zone_ids"></a> [private\_dns\_zone\_ids](#input\_private\_dns\_zone\_ids) | "Override IDs for private DNS zones. If not provided, zones will be looked up in \"private\_dns\_zone\_resource\_group\_name\" (if provided) or Virtual Network resource group. Use this to reference DNS zones in different subscriptions." | <pre>object({<br/>    blob          = optional(string)<br/>    file          = optional(string)<br/>    queue         = optional(string)<br/>    table         = optional(string)<br/>    azurewebsites = optional(string)<br/>  })</pre> | `null` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_size"></a> [size](#input\_size) | App Service Plan size. Allowed values: 'P0v3', 'P1v3', 'P2mv3', 'P3mv3'. If not set, it will be determined by the use\_case. | `string` | `null` | no |
| <a name="input_slot_app_settings"></a> [slot\_app\_settings](#input\_slot\_app\_settings) | A map of application settings specific to the staging slot of the Function App. | `map(string)` | `{}` | no |
| <a name="input_stack"></a> [stack](#input\_stack) | The runtime stack for the Function App. Allowed values are 'node' and 'java'. | `string` | `"node"` | no |
| <a name="input_sticky_app_setting_names"></a> [sticky\_app\_setting\_names](#input\_sticky\_app\_setting\_names) | A list of application setting names that should remain constant and not be swapped between slots. | `list(string)` | `[]` | no |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | The CIDR block for the subnet used by the Function App for outbound connectivity. Mandatory if 'subnet\_id' is not set. | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | The ID of the subnet where the Function App will be hosted. Leave null to create a new subnet. | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet designated for private endpoints. | `string` | n/a | yes |
| <a name="input_subnet_service_endpoints"></a> [subnet\_service\_endpoints](#input\_subnet\_service\_endpoints) | Enable service endpoints for the subnet used by the Function App. Set this only if dependencies do not use private endpoints. | <pre>object({<br/>    cosmos  = optional(bool, false)<br/>    storage = optional(bool, false)<br/>    web     = optional(bool, false)<br/>  })</pre> | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_tls_version"></a> [tls\_version](#input\_tls\_version) | Minimum TLS version for the App Service. | `number` | `1.2` | no |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Function App use case. Allowed values: 'default', 'high\_load'. | `string` | `"default"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Details of the virtual network where the subnet for the Function App will be created. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_diagnostic_settings"></a> [diagnostic\_settings](#output\_diagnostic\_settings) | Details of the diagnostic settings configured for the Function App. |
| <a name="output_function_app"></a> [function\_app](#output\_function\_app) | Details of the Function App, including its resource group, service plan, and app-specific information such as ID, name, principal ID, and default hostname. Also includes details of the app slot if configured. |
| <a name="output_storage_account"></a> [storage\_account](#output\_storage\_account) | Details of the primary storage account used by the Function App, including its ID and name. |
| <a name="output_storage_account_durable"></a> [storage\_account\_durable](#output\_storage\_account\_durable) | Details of the storage account used for durable functions, including its ID and name. Returns null if not configured. |
| <a name="output_subnet"></a> [subnet](#output\_subnet) | Details of the subnet used by the Function App, including its ID and name. |
<!-- END_TF_DOCS -->
