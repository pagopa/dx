# networking

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_subnet.dns_forwarder_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.pep_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.runner_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.test_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.vpn_snet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_virtual_network.vnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network) | resource |
| [dx_available_subnet_cidr.dns_forwarder_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [dx_available_subnet_cidr.pep_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [dx_available_subnet_cidr.runner_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [dx_available_subnet_cidr.test_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [dx_available_subnet_cidr.vpn_cidr](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_location"></a> [location](#input\_location) | Location | `string` | n/a | yes |
| <a name="input_naming_config"></a> [naming\_config](#input\_naming\_config) | Map with naming values for resource names | <pre>object({<br/>    prefix          = string,<br/>    environment     = string,<br/>    location        = string,<br/>    instance_number = optional(number, 1),<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_test_enabled"></a> [test\_enabled](#input\_test\_enabled) | Enable test resources | `bool` | n/a | yes |
| <a name="input_vnet_cidr"></a> [vnet\_cidr](#input\_vnet\_cidr) | VNet CIDR block | `string` | n/a | yes |
| <a name="input_vpn_enabled"></a> [vpn\_enabled](#input\_vpn\_enabled) | Enable VPN CIDR identification | `bool` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dns_forwarder_snet"></a> [dns\_forwarder\_snet](#output\_dns\_forwarder\_snet) | n/a |
| <a name="output_pep_snet"></a> [pep\_snet](#output\_pep\_snet) | n/a |
| <a name="output_runner_snet"></a> [runner\_snet](#output\_runner\_snet) | n/a |
| <a name="output_test_snet"></a> [test\_snet](#output\_test\_snet) | n/a |
| <a name="output_vnet"></a> [vnet](#output\_vnet) | n/a |
| <a name="output_vpn_snet"></a> [vpn\_snet](#output\_vpn\_snet) | n/a |
<!-- END_TF_DOCS -->
