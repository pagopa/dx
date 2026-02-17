# advanced

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.9 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0.6 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_cdn"></a> [azure\_cdn](#module\_azure\_cdn) | ../../ | n/a |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.e2e](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint_host_name"></a> [endpoint\_host\_name](#output\_endpoint\_host\_name) | CDN endpoint |
| <a name="output_profile_id"></a> [profile\_id](#output\_profile\_id) | The ID of the CDN profile |
<!-- END_TF_DOCS -->
