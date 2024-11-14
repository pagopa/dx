# common_environment

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_dns"></a> [dns](#module\_dns) | ./_modules/dns | n/a |
| <a name="module_key_vault"></a> [key\_vault](#module\_key\_vault) | ./_modules/key_vault | n/a |
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |
| <a name="module_network"></a> [network](#module\_network) | ./_modules/networking | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.dashboards](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.github_managed_identity](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.role_assignment](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_pep_subnet_cidr"></a> [pep\_subnet\_cidr](#input\_pep\_subnet\_cidr) | CIDR block for the private endpoint subnet | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_virtual_network_cidr"></a> [virtual\_network\_cidr](#input\_virtual\_network\_cidr) | CIDR block for the virtual network | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_common_nat_gateways"></a> [common\_nat\_gateways](#output\_common\_nat\_gateways) | n/a |
| <a name="output_common_pep_snet"></a> [common\_pep\_snet](#output\_common\_pep\_snet) | n/a |
| <a name="output_common_resource_group_name"></a> [common\_resource\_group\_name](#output\_common\_resource\_group\_name) | n/a |
| <a name="output_common_vnet"></a> [common\_vnet](#output\_common\_vnet) | n/a |
<!-- END_TF_DOCS -->
