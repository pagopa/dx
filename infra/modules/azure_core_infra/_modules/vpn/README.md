# vpn

<!-- BEGIN_TF_DOCS -->

## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name                                                                                                                                            | Type        |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_container_group.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_group)                 | resource    |
| [azurerm_public_ip.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip)                             | resource    |
| [azurerm_virtual_network_gateway.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway) | resource    |
| [time_sleep.wait_public_ips](https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep)                                | resource    |
| [azuread_application.vpn_app](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application)                   | data source |

## Inputs

| Name                                                                                                | Description                                                                                                                                      | Type                                                                                                                                             | Default     | Required |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | :------: |
| <a name="input_aws_vpn_enabled"></a> [aws_vpn_enabled](#input_aws_vpn_enabled)                      | A boolean flag to enable or disable the creation of the required resources to support a site-to-site VPN connection towards AWS.                 | `bool`                                                                                                                                           | `false`     |    no    |
| <a name="input_dnsforwarder_subnet_id"></a> [dnsforwarder_subnet_id](#input_dnsforwarder_subnet_id) | DNS forwarder subnet ID.                                                                                                                         | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_env_short"></a> [env_short](#input_env_short)                                        | Environment in short form where resources are located                                                                                            | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_instance_number"></a> [instance_number](#input_instance_number)                      | The instance number of the resource, used to differentiate multiple instances of the same resource type within the same project and environment. | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_location"></a> [location](#input_location)                                           | Location                                                                                                                                         | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_naming_config"></a> [naming_config](#input_naming_config)                            | Map with naming values for resource names                                                                                                        | <pre>object({<br/> prefix = string,<br/> environment = string,<br/> location = string,<br/> instance_number = optional(number, 1),<br/> })</pre> | n/a         |   yes    |
| <a name="input_prefix"></a> [prefix](#input_prefix)                                                 | Project prefix                                                                                                                                   | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_project"></a> [project](#input_project)                                              | Env prefix, short environment and short location                                                                                                 | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_resource_group_name"></a> [resource_group_name](#input_resource_group_name)          | Resource group name                                                                                                                              | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                                                       | Resources tags                                                                                                                                   | `map(any)`                                                                                                                                       | n/a         |   yes    |
| <a name="input_tenant_id"></a> [tenant_id](#input_tenant_id)                                        | Tenant ID                                                                                                                                        | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_vpn_enabled"></a> [vpn_enabled](#input_vpn_enabled)                                  | A boolean flag to enable or disable the creation of a VPN.                                                                                       | `bool`                                                                                                                                           | `false`     |    no    |
| <a name="input_vpn_subnet_id"></a> [vpn_subnet_id](#input_vpn_subnet_id)                            | VPN network subnet ID.                                                                                                                           | `string`                                                                                                                                         | n/a         |   yes    |
| <a name="input_vpn_use_case"></a> [vpn_use_case](#input_vpn_use_case)                               | Site-to-Site VPN use case. Allowed values: 'default', 'high_availability'.                                                                       | `string`                                                                                                                                         | `"default"` |    no    |

## Outputs

| Name                                                              | Description                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| <a name="output_fqdns"></a> [fqdns](#output_fqdns)                | The FQDNs for the gateway.                           |
| <a name="output_gateway_id"></a> [gateway_id](#output_gateway_id) | The ID of the virtual network gateway.               |
| <a name="output_public_ips"></a> [public_ips](#output_public_ips) | The public IP addresses associated with the gateway. |

<!-- END_TF_DOCS -->
