# DX - Azure Function App Exposed Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-function-app-exposed/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-function-app-exposed%2Fazurerm%2Flatest)

## Diagram
<!-- START_TF_GRAPH -->
<!-- END_TF_GRAPH -->

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_linux_function_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app) | resource |
| [azurerm_linux_function_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app_slot) | resource |
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

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | The ID of the App Service Plan where the Function App will be hosted. Leave null to create a new plan. | `string` | `null` | no |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | A map of application settings for the Function App. | `map(string)` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | The connection string for Application Insights to enable monitoring and diagnostics. | `string` | `null` | no |
| <a name="input_application_insights_sampling_percentage"></a> [application\_insights\_sampling\_percentage](#input\_application\_insights\_sampling\_percentage) | The sampling percentage for Application Insights telemetry. Default is 5. | `number` | `5` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_has_durable_functions"></a> [has\_durable\_functions](#input\_has\_durable\_functions) | Set to true if the Function App hosts Durable Functions. | `bool` | `false` | no |
| <a name="input_health_check_path"></a> [health\_check\_path](#input\_health\_check\_path) | The endpoint path where the health probe is exposed for the Function App. | `string` | n/a | yes |
| <a name="input_java_version"></a> [java\_version](#input\_java\_version) | The version of Java to use for the Function App runtime. | `string` | `17` | no |
| <a name="input_node_version"></a> [node\_version](#input\_node\_version) | The version of Node.js to use for the Function App runtime. | `number` | `20` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_slot_app_settings"></a> [slot\_app\_settings](#input\_slot\_app\_settings) | A map of application settings specific to the staging slot of the Function App. | `map(string)` | `{}` | no |
| <a name="input_stack"></a> [stack](#input\_stack) | The runtime stack for the Function App. Allowed values are 'node' and 'java'. | `string` | `"node"` | no |
| <a name="input_sticky_app_setting_names"></a> [sticky\_app\_setting\_names](#input\_sticky\_app\_setting\_names) | A list of application setting names that should remain constant and not be swapped between slots. | `list(string)` | `[]` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on workload. Allowed values are 's', 'm', 'l', 'xl', 'xxl'. Legacy values 'premium', 'standard', 'test' are also supported for backward compatibility. | `string` | `"l"` | no |
| <a name="input_tls_version"></a> [tls\_version](#input\_tls\_version) | Minimum TLS version for the App Service. | `number` | `1.2` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_function_app"></a> [function\_app](#output\_function\_app) | Details of the Function App, including its resource group, service plan, and app-specific information such as ID, name, principal ID, and default hostname. Also includes details of the app slot if configured. |
| <a name="output_storage_account"></a> [storage\_account](#output\_storage\_account) | n/a |
| <a name="output_storage_account_durable"></a> [storage\_account\_durable](#output\_storage\_account\_durable) | Details of the storage account used for durable functions, including its ID and name. Returns null if not configured. |
<!-- END_TF_DOCS -->
