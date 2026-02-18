# setup

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.7 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_cdn_integration"></a> [azure\_cdn\_integration](#module\_azure\_cdn\_integration) | pagopa-dx/azure-cdn/azurerm | ~> 0.5 |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_dns_zone.devex_pagopa_it](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_zone) | resource |
| [azurerm_resource_group.integration](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subnet.snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cdn_profile_id"></a> [cdn\_profile\_id](#output\_cdn\_profile\_id) | n/a |
| <a name="output_devex_pagopa_it_zone_name"></a> [devex\_pagopa\_it\_zone\_name](#output\_devex\_pagopa\_it\_zone\_name) | n/a |
| <a name="output_pep_id"></a> [pep\_id](#output\_pep\_id) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
| <a name="output_storage_account_host_name"></a> [storage\_account\_host\_name](#output\_storage\_account\_host\_name) | n/a |
| <a name="output_storage_account_id"></a> [storage\_account\_id](#output\_storage\_account\_id) | n/a |
| <a name="output_subnet_id"></a> [subnet\_id](#output\_subnet\_id) | n/a |
<!-- END_TF_DOCS -->
