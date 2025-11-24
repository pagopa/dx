# network_access

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.13.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_pagopa-dx"></a> [pagopa-dx](#requirement\_pagopa-dx) | ~> 0.8 |
| <a name="requirement_random"></a> [random](#requirement\_random) | ~> 3.7 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_private_appcs"></a> [private\_appcs](#module\_private\_appcs) | pagopa-dx/azure-app-configuration/azurerm | ~> 0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.e2e_appcs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [random_integer.appcs_instance](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer) | resource |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_virtual_network.e2e](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_name"></a> [name](#output\_name) | n/a |
<!-- END_TF_DOCS -->
