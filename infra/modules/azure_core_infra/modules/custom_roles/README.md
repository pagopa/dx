# custom_roles

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.62 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_dx_app_cd_resource_group_deploy"></a> [dx\_app\_cd\_resource\_group\_deploy](#module\_dx\_app\_cd\_resource\_group\_deploy) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_app_ci_resource_group_reader"></a> [dx\_app\_ci\_resource\_group\_reader](#module\_dx\_app\_ci\_resource\_group\_reader) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_function_durable_storage"></a> [dx\_function\_durable\_storage](#module\_dx\_function\_durable\_storage) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_function_host_storage"></a> [dx\_function\_host\_storage](#module\_dx\_function\_host\_storage) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_infra_cd_private_networking"></a> [dx\_infra\_cd\_private\_networking](#module\_dx\_infra\_cd\_private\_networking) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_infra_cd_resource_group_deploy"></a> [dx\_infra\_cd\_resource\_group\_deploy](#module\_dx\_infra\_cd\_resource\_group\_deploy) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_infra_cd_subscription_admin"></a> [dx\_infra\_cd\_subscription\_admin](#module\_dx\_infra\_cd\_subscription\_admin) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_infra_ci_resource_group_reader"></a> [dx\_infra\_ci\_resource\_group\_reader](#module\_dx\_infra\_ci\_resource\_group\_reader) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |
| <a name="module_dx_infra_ci_subscription_reader"></a> [dx\_infra\_ci\_subscription\_reader](#module\_dx\_infra\_ci\_subscription\_reader) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the custom roles will be created. Omit it together with subscription\_name to use the current provider subscription automatically. | `string` | `null` | no |
| <a name="input_subscription_name"></a> [subscription\_name](#input\_subscription\_name) | The display name of the subscription where the custom roles will be created. Omit it to auto-discover the display name for the selected subscription. | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dx_app_ci_resource_group_reader"></a> [dx\_app\_ci\_resource\_group\_reader](#output\_dx\_app\_ci\_resource\_group\_reader) | The merged custom role name for the App CI resource group reader role. |
| <a name="output_dx_function_durable_storage"></a> [dx\_function\_durable\_storage](#output\_dx\_function\_durable\_storage) | The merged custom role name for the Function App durable storage role. |
| <a name="output_dx_function_host_storage"></a> [dx\_function\_host\_storage](#output\_dx\_function\_host\_storage) | The merged custom role name for the Function App host storage role. |
| <a name="output_dx_infra_cd_subscription_admin"></a> [dx\_infra\_cd\_subscription\_admin](#output\_dx\_infra\_cd\_subscription\_admin) | The merged custom role name for the Infra CD subscription admin role. |
| <a name="output_dx_infra_ci_subscription_reader"></a> [dx\_infra\_ci\_subscription\_reader](#output\_dx\_infra\_ci\_subscription\_reader) | The merged custom role name for the Infra CI subscription reader role. |
<!-- END_TF_DOCS -->
