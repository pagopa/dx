# subscription_scope

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.114, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_observability_reader"></a> [observability\_reader](#module\_observability\_reader) | ../.. | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_custom_role_id"></a> [custom\_role\_id](#output\_custom\_role\_id) | Resource ID of the merged custom role |
| <a name="output_custom_role_name"></a> [custom\_role\_name](#output\_custom\_role\_name) | Name of the merged custom role |
<!-- END_TF_DOCS -->
