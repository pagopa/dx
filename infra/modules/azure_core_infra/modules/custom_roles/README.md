# custom_roles

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

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
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the custom roles will be created. | `string` | `null` | no |
| <a name="input_subscription_name"></a> [subscription\_name](#input\_subscription\_name) | The display name of the subscription where the custom roles will be created. | `string` | `null` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
