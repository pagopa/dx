# setup

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version |
| ------------------------------------------------------------------ | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~> 4.0  |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | ~> 0.8  |
| <a name="requirement_random"></a> [random](#requirement_random)    | ~> 3.7  |

## Modules

No modules.

## Resources

| Name                                                                                                                                             | Type        |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [azurerm_key_vault.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault)                                | resource    |
| [azurerm_private_endpoint.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint)                  | resource    |
| [azurerm_resource_group.sut](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                     | resource    |
| [random_integer.appcs_kv_instance](https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer)                       | resource    |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config)                | data source |
| [azurerm_private_dns_zone.appcs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)            | data source |
| [azurerm_private_dns_zone.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone)               | data source |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group)              | data source |
| [azurerm_resource_group.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group)                 | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet)                                  | data source |
| [azurerm_user_assigned_identity.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/user_assigned_identity) | data source |
| [azurerm_virtual_network.vnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network)               | data source |

## Inputs

| Name                                                               | Description                         | Type                                                                                                                                                                                | Default | Required |
| ------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_environment"></a> [environment](#input_environment) | n/a                                 | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = optional(string)<br/> app_name = string<br/> instance_number = string<br/> })</pre> | n/a     |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                      | Tags to apply to setup resources    | `map(string)`                                                                                                                                                                       | n/a     |   yes    |
| <a name="input_test_kind"></a> [test_kind](#input_test_kind)       | A value between integration and e2e | `string`                                                                                                                                                                            | n/a     |   yes    |

## Outputs

| Name                                                                                                                                            | Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| <a name="output_key_vaults"></a> [key_vaults](#output_key_vaults)                                                                               | n/a         |
| <a name="output_managed_identity_principal_id"></a> [managed_identity_principal_id](#output_managed_identity_principal_id)                      | n/a         |
| <a name="output_private_dns_zone_appcs"></a> [private_dns_zone_appcs](#output_private_dns_zone_appcs)                                           | n/a         |
| <a name="output_private_dns_zone_resource_group_name"></a> [private_dns_zone_resource_group_name](#output_private_dns_zone_resource_group_name) | n/a         |
| <a name="output_resource_group_name"></a> [resource_group_name](#output_resource_group_name)                                                    | n/a         |
| <a name="output_subnet_pep_id"></a> [subnet_pep_id](#output_subnet_pep_id)                                                                      | n/a         |
| <a name="output_subscription_id"></a> [subscription_id](#output_subscription_id)                                                                | n/a         |
| <a name="output_virtual_network"></a> [virtual_network](#output_virtual_network)                                                                | n/a         |

<!-- END_TF_DOCS -->
