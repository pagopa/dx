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
| <a name="module_azure_cdn_reuse_profile"></a> [azure\_cdn\_reuse\_profile](#module\_azure\_cdn\_reuse\_profile) | pagopa-dx/azure-cdn/azurerm | ~> 0.5 |
| <a name="module_azure_cdn_with_waf"></a> [azure\_cdn\_with\_waf](#module\_azure\_cdn\_with\_waf) | pagopa-dx/azure-cdn/azurerm | ~> 0.5 |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |
| <a name="module_storage_account_secondary"></a> [storage\_account\_secondary](#module\_storage\_account\_secondary) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |

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
| <a name="output_cdn_reuse_profile_endpoint"></a> [cdn\_reuse\_profile\_endpoint](#output\_cdn\_reuse\_profile\_endpoint) | CDN endpoint reusing existing profile |
| <a name="output_cdn_with_waf_endpoint"></a> [cdn\_with\_waf\_endpoint](#output\_cdn\_with\_waf\_endpoint) | CDN endpoint with WAF protection |
| <a name="output_cdn_with_waf_profile_id"></a> [cdn\_with\_waf\_profile\_id](#output\_cdn\_with\_waf\_profile\_id) | CDN profile ID that can be reused |
<!-- END_TF_DOCS -->
