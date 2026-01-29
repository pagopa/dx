# merge-roles

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_role_definition.merged](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition) | resource |
| [azurerm_role_definition.source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/role_definition) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_role_name"></a> [role\_name](#input\_role\_name) | Name of the custom role definition to create. | `string` | n/a | yes |
| <a name="input_source_roles"></a> [source\_roles](#input\_source\_roles) | List of built-in Azure role names to merge into a custom role definition. | `list(string)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_custom_role_id"></a> [custom\_role\_id](#output\_custom\_role\_id) | ID of the newly created custom role definition |
| <a name="output_merged_actions_count"></a> [merged\_actions\_count](#output\_merged\_actions\_count) | Total number of distinct actions in the merged role |
<!-- END_TF_DOCS -->
