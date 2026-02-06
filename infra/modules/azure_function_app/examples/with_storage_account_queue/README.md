# with_storage_account_queue

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_function_app"></a> [azure\_function\_app](#module\_azure\_function\_app) | pagopa-dx/azure-function-app/azurerm | ~> 4.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_storage_account.external](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
