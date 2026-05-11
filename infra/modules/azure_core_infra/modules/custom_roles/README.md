# custom_roles

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version |
| ------------------------------------------------------------------ | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~> 4.62 |

## Modules

| Name                                                                                                                                   | Source                              | Version |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| <a name="module_dx_app_cd_resource_group_deploy"></a> [dx_app_cd_resource_group_deploy](#module_dx_app_cd_resource_group_deploy)       | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_app_ci_resource_group_reader"></a> [dx_app_ci_resource_group_reader](#module_dx_app_ci_resource_group_reader)       | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_function_durable_storage"></a> [dx_function_durable_storage](#module_dx_function_durable_storage)                   | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_function_host_storage"></a> [dx_function_host_storage](#module_dx_function_host_storage)                            | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_private_networking"></a> [dx_infra_cd_private_networking](#module_dx_infra_cd_private_networking)          | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_resource_group_deploy"></a> [dx_infra_cd_resource_group_deploy](#module_dx_infra_cd_resource_group_deploy) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_cd_subscription_admin"></a> [dx_infra_cd_subscription_admin](#module_dx_infra_cd_subscription_admin)          | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_ci_resource_group_reader"></a> [dx_infra_ci_resource_group_reader](#module_dx_infra_ci_resource_group_reader) | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |
| <a name="module_dx_infra_ci_subscription_reader"></a> [dx_infra_ci_subscription_reader](#module_dx_infra_ci_subscription_reader)       | pagopa-dx/azure-merge-roles/azurerm | ~> 0.1  |

## Resources

| Name                                                                                                                            | Type        |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name                                                                                 | Description                                                                  | Type     | Default | Required |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------- | ------- | :------: |
| <a name="input_subscription_id"></a> [subscription_id](#input_subscription_id)       | The ID of the subscription where the custom roles will be created.           | `string` | `null`  |    no    |
| <a name="input_subscription_name"></a> [subscription_name](#input_subscription_name) | The display name of the subscription where the custom roles will be created. | `string` | `null`  |    no    |

## Outputs

| Name                                                                                                                             | Description                                                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| <a name="output_dx_app_ci_resource_group_reader"></a> [dx_app_ci_resource_group_reader](#output_dx_app_ci_resource_group_reader) | The merged custom role name for the App CI resource group reader role. |
| <a name="output_dx_function_durable_storage"></a> [dx_function_durable_storage](#output_dx_function_durable_storage)             | The merged custom role name for the Function App durable storage role. |
| <a name="output_dx_function_host_storage"></a> [dx_function_host_storage](#output_dx_function_host_storage)                      | The merged custom role name for the Function App host storage role.    |
| <a name="output_dx_infra_cd_subscription_admin"></a> [dx_infra_cd_subscription_admin](#output_dx_infra_cd_subscription_admin)    | The merged custom role name for the Infra CD subscription admin role.  |
| <a name="output_dx_infra_ci_subscription_reader"></a> [dx_infra_ci_subscription_reader](#output_dx_infra_ci_subscription_reader) | The merged custom role name for the Infra CI subscription reader role. |

<!-- END_TF_DOCS -->
