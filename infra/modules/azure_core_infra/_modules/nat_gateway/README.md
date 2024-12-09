# nat_gateway

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_nat_gateway.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/nat_gateway) | resource |
| [azurerm_nat_gateway_public_ip_prefix_association.this_ippres](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/nat_gateway_public_ip_prefix_association) | resource |
| [azurerm_public_ip_prefix.ng](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip_prefix) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_location"></a> [location](#input\_location) | Location | `string` | n/a | yes |
| <a name="input_ng_ippres_number"></a> [ng\_ippres\_number](#input\_ng\_ippres\_number) | Number of Public IP Prefix assigned to the nat gateway | `number` | `3` | no |
| <a name="input_ng_number"></a> [ng\_number](#input\_ng\_number) | Number of nat gateways to deploy | `number` | `1` | no |
| <a name="input_project"></a> [project](#input\_project) | IO prefix, short environment and short location | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_nat_gateways"></a> [nat\_gateways](#output\_nat\_gateways) | n/a |
| <a name="output_public_ip_prefix"></a> [public\_ip\_prefix](#output\_public\_ip\_prefix) | n/a |
<!-- END_TF_DOCS -->
