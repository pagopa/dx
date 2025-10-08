# test_infrastructure

<!-- BEGIN_TF_DOCS -->

## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name                                                                                                                                                                                                      | Type        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_log_analytics_workspace.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace)                                                          | resource    |
| [azurerm_network_security_group.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group)                                                           | resource    |
| [azurerm_network_security_rule.deny_common_to_tests_vnets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule)                                         | resource    |
| [azurerm_private_dns_zone_virtual_network_link.tests_peps](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link)                         | resource    |
| [azurerm_subnet.pep_snets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet)                                                                                        | resource    |
| [azurerm_subnet_network_security_group_association.common_runner_to_tests_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association) | resource    |
| [azurerm_virtual_network.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network)                                                                          | resource    |
| [azurerm_virtual_network_peering.common_to_tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering)                                                | resource    |
| [azurerm_virtual_network_peering.tests_to_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering)                                                | resource    |
| [dx_available_subnet_cidr.pep_snet_cidrs](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr)                                                            | resource    |
| [azurerm_resource_group.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group)                                                                         | data source |

## Inputs

| Name                                                                                                | Description                                                                             | Type                                                                                                                             | Default | Required |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_environment"></a> [environment](#input_environment)                                  | n/a                                                                                     | <pre>object({<br/> prefix = string<br/> environment = string<br/> location = string<br/> instance_number = string<br/> })</pre>  | n/a     |   yes    |
| <a name="input_private_dns_zone_names"></a> [private_dns_zone_names](#input_private_dns_zone_names) | Map of private DNS zone names to link to the test virtual networks                      | `list(string)`                                                                                                                   | n/a     |   yes    |
| <a name="input_runner_subnet_name"></a> [runner_subnet_name](#input_runner_subnet_name)             | Name of the subnet where the GitHub runners are deployed                                | `string`                                                                                                                         | n/a     |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                                                       | Tags to apply to resources                                                              | `map(string)`                                                                                                                    | n/a     |   yes    |
| <a name="input_test_modes"></a> [test_modes](#input_test_modes)                                     | List of test kinds to create resources for. Allowed values are 'integration' and 'e2e'. | `set(string)`                                                                                                                    | n/a     |   yes    |
| <a name="input_vnet_common"></a> [vnet_common](#input_vnet_common)                                  | n/a                                                                                     | <pre>object({<br/> name = string<br/> resource_group_name = string<br/> id = string<br/> subnet_ids = list(string)<br/> })</pre> | n/a     |   yes    |

## Outputs

No outputs.

<!-- END_TF_DOCS -->
