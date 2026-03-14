# setup

Provisions the shared infrastructure needed by **integration tests only**.

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version           |
| ------------------------------------------------------------------ | ----------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~> 4.0            |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | >= 0.0.6, < 1.0.0 |
| <a name="requirement_random"></a> [random](#requirement_random)    | ~> 3.7            |

## Modules

No modules.

## Resources

| Name                                                                                                                                 | Type        |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [azurerm_resource_group.sut](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)         | resource    |
| [random_integer.instance_base](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer)               | resource    |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config)    | data source |
| [azurerm_private_dns_zone.blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group)  | data source |
| [azurerm_resource_group.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group)     | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet)                      | data source |
| [azurerm_virtual_network.vnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network)   | data source |

## Inputs

| Name                                                               | Description                               | Type                                                                                                                                                                                | Default | Required |
| ------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_environment"></a> [environment](#input_environment) | n/a                                       | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = optional(string)<br/> app_name = string<br/> instance_number = string<br/> })</pre> | n/a     |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                      | A map of tags to assign to the resources. | `map(string)`                                                                                                                                                                       | `{}`    |    no    |
| <a name="input_test_kind"></a> [test_kind](#input_test_kind)       | Test type: must be 'integration'.         | `string`                                                                                                                                                                            | n/a     |   yes    |

## Outputs

| Name                                                                                                                                            | Description                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| <a name="output_instance_numbers"></a> [instance_numbers](#output_instance_numbers)                                                             | Map of unique instance numbers per scenario. |
| <a name="output_private_dns_zone_resource_group_name"></a> [private_dns_zone_resource_group_name](#output_private_dns_zone_resource_group_name) | n/a                                          |
| <a name="output_resource_group_name"></a> [resource_group_name](#output_resource_group_name)                                                    | n/a                                          |
| <a name="output_subnet_pep_id"></a> [subnet_pep_id](#output_subnet_pep_id)                                                                      | n/a                                          |
| <a name="output_subscription_id"></a> [subscription_id](#output_subscription_id)                                                                | n/a                                          |
| <a name="output_tags"></a> [tags](#output_tags)                                                                                                 | n/a                                          |
| <a name="output_virtual_network"></a> [virtual_network](#output_virtual_network)                                                                | n/a                                          |

<!-- END_TF_DOCS -->
