# DX - Azure App Service Module

This module is used to create an Azure App Service, allowing it to be configured as exposed.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_linux_web_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app) | resource |
| [azurerm_linux_web_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot) | resource |
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | (Optional) Set the AppService Id where you want to host the Function App | `string` | `null` | no |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | Application settings | `map(string)` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | (Optional) Application Insights connection string | `string` | `null` | no |
| <a name="input_application_insights_sampling_percentage"></a> [application\_insights\_sampling\_percentage](#input\_application\_insights\_sampling\_percentage) | (Optional) The sampling percentage of Application Insights. Default is 5 | `number` | `5` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_health_check_path"></a> [health\_check\_path](#input\_health\_check\_path) | Endpoint where health probe is exposed | `string` | n/a | yes |
| <a name="input_java_version"></a> [java\_version](#input\_java\_version) | Java version to use | `string` | `17` | no |
| <a name="input_node_version"></a> [node\_version](#input\_node\_version) | Node version to use | `number` | `20` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_slot_app_settings"></a> [slot\_app\_settings](#input\_slot\_app\_settings) | Staging slot application settings | `map(string)` | `{}` | no |
| <a name="input_stack"></a> [stack](#input\_stack) | n/a | `string` | `"node"` | no |
| <a name="input_sticky_app_setting_names"></a> [sticky\_app\_setting\_names](#input\_sticky\_app\_setting\_names) | (Optional) A list of application setting names that are not swapped between slots | `list(string)` | `[]` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on workload. Allowed values are 'xs', 's', 'm', 'l', 'xl'. Legacy values 'premium', 'standard', 'test' are also supported for backward compatibility. | `string` | `"l"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_app_service"></a> [app\_service](#output\_app\_service) | n/a |
<!-- END_TF_DOCS -->
