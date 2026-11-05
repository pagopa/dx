<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version |
| ------------------------------------------------------------------ | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~> 4.62 |

## Modules

| Name                                                                                                                                        | Source                              | Version |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| <a name="module_dx_app_cd_resource_group_deploy"></a> [dx\_app\_cd\_resource\_group\_deploy](#module_dx_app_cd_resource_group_deploy)       | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_app_ci_resource_group_reader"></a> [dx\_app\_ci\_resource\_group\_reader](#module_dx_app_ci_resource_group_reader)       | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_function_durable_storage"></a> [dx\_function\_durable\_storage](#module_dx_function_durable_storage)                     | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_function_host_storage"></a> [dx\_function\_host\_storage](#module_dx_function_host_storage)                              | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_private_networking"></a> [dx\_infra\_cd\_private\_networking](#module_dx_infra_cd_private_networking)           | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_resource_group_deploy"></a> [dx\_infra\_cd\_resource\_group\_deploy](#module_dx_infra_cd_resource_group_deploy) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_subscription_admin"></a> [dx\_infra\_cd\_subscription\_admin](#module_dx_infra_cd_subscription_admin)           | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_ci_resource_group_reader"></a> [dx\_infra\_ci\_resource\_group\_reader](#module_dx_infra_ci_resource_group_reader) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_ci_subscription_reader"></a> [dx\_infra\_ci\_subscription\_reader](#module_dx_infra_ci_subscription_reader)        | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |

## Resources

| Name                                                                                                                            | Type        |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name                                                                                  | Description                                                                                                                                                         | Type     | Default | Required |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- | :------: |
| <a name="input_subscription_id"></a> [subscription\_id](#input_subscription_id)       | The ID of the subscription where the custom roles will be created. Omit it together with subscription\_name to use the current provider subscription automatically. | `string` | `null`  |    no    |
| <a name="input_subscription_name"></a> [subscription\_name](#input_subscription_name) | The display name of the subscription where the custom roles will be created. Omit it to auto-discover the display name for the selected subscription.               | `string` | `null`  |    no    |

## Outputs

| Name                                                                                                                                  | Description                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| <a name="output_dx_app_ci_resource_group_reader"></a> [dx\_app\_ci\_resource\_group\_reader](#output_dx_app_ci_resource_group_reader) | The merged custom role name for the App CI resource group reader role. |
| <a name="output_dx_function_durable_storage"></a> [dx\_function\_durable\_storage](#output_dx_function_durable_storage)               | The merged custom role name for the Function App durable storage role. |
| <a name="output_dx_function_host_storage"></a> [dx\_function\_host\_storage](#output_dx_function_host_storage)                        | The merged custom role name for the Function App host storage role.    |
| <a name="output_dx_infra_cd_subscription_admin"></a> [dx\_infra\_cd\_subscription\_admin](#output_dx_infra_cd_subscription_admin)     | The merged custom role name for the Infra CD subscription admin role.  |
| <a name="output_dx_infra_ci_subscription_reader"></a> [dx\_infra\_ci\_subscription\_reader](#output_dx_infra_ci_subscription_reader)  | The merged custom role name for the Infra CI subscription reader role. |

<!-- END_TF_DOCS -->
