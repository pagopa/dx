<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version         |
| ------------------------------------------------------------------ | --------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | >= 3.114, < 5.0 |

## Modules

No modules.

## Resources

| Name                                                                                                                                                      | Type     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [azurerm_cosmosdb_sql_role_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_role_assignment.control_plane](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |

## Inputs

| Name                                                                            | Description                                                                  | Type                                                                                                                                                                                                                               | Default | Required |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_cosmos"></a> [cosmos](#input_cosmos)                             | A list of CosmosDB role assignments                                          | <pre>list(object({<br/> account_name = string<br/> resource_group_name = string<br/> role = string<br/> description = string<br/> database = optional(string, "_")<br/> collections = optional(list(string), ["_"])<br/> }))</pre> | `[]`    |    no    |
| <a name="input_principal_id"></a> [principal\_id](#input_principal_id)          | The ID of the principal to which assign roles. It can be a managed identity. | `string`                                                                                                                                                                                                                           | n/a     |   yes    |
| <a name="input_subscription_id"></a> [subscription\_id](#input_subscription_id) | The ID of the subscription where the target resources are located            | `string`                                                                                                                                                                                                                           | n/a     |   yes    |

## Outputs

| Name                                                                                                                                                | Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| <a name="output_azurerm_cosmosdb_sql_role_assignment"></a> [azurerm\_cosmosdb\_sql\_role\_assignment](#output_azurerm_cosmosdb_sql_role_assignment) | n/a         |
| <a name="output_azurerm_role_assignment"></a> [azurerm\_role\_assignment](#output_azurerm_role_assignment)                                          | n/a         |

<!-- END_TF_DOCS -->
