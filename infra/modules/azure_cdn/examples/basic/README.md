# basic

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_cdn"></a> [azure\_cdn](#module\_azure\_cdn) | ../../ | n/a |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | ../../../azure_storage_account | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cdn_endpoint_url"></a> [cdn\_endpoint\_url](#output\_cdn\_endpoint\_url) | n/a |
<!-- END_TF_DOCS -->
