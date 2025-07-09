# application_insights

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_application_insights.appi](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights) | resource |
| [azurerm_key_vault_secret.appinsights_instrumentation_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_daily_data_cap_in_gb"></a> [daily\_data\_cap\_in\_gb](#input\_daily\_data\_cap\_in\_gb) | The daily data cap in GB for Application Insights | `number` | `100` | no |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | The ID of the Key Vault where Application Insights secrets will be stored | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | The location in which the Log Analytics will be created | `string` | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics Workspace to link with Application Insights | `string` | n/a | yes |
| <a name="input_naming_config"></a> [naming\_config](#input\_naming\_config) | Map with naming values for resource names | <pre>object({<br/>    prefix          = string,<br/>    environment     = string,<br/>    location        = string,<br/>    instance_number = optional(number, 1),<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group in which the Log Analytics will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A mapping of tags to assign to the resource | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_instrumentation_key_kv_secret_id"></a> [instrumentation\_key\_kv\_secret\_id](#output\_instrumentation\_key\_kv\_secret\_id) | n/a |
| <a name="output_instrumentation_key_kv_secret_name"></a> [instrumentation\_key\_kv\_secret\_name](#output\_instrumentation\_key\_kv\_secret\_name) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
