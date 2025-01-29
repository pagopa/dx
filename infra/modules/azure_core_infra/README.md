# Core Infrastructure module
The module provisions all the resources required for the initial configuration of a subscription.

The module, named `azure_core_infra`, includes the following:

- A virtual network (`VNet`) with subnets for private endpoints.
- A VPN, if specified.
- Resource groups for the VNet, common resources, and testing.
- A common Key Vault with a private endpoint.
- Private DNS zones for all resource types.
- (Optional) An API Management
- (Optional) A Cosmos DB
- (Optional) A Storage Account

## Examples

```hcl
module "core" {
  source = "github.com/pagopa/dx//infra/modules/azure_core_infra?ref=main"

  test_enabled = true # set to false if you want to create all resources

  environment  = local.environment

  virtual_network_cidr = "10.50.0.0/16"
  pep_subnet_cidr      = "10.50.2.0/23"

  vpn = {
    cidr_subnet              = "10.50.133.0/24"
    dnsforwarder_cidr_subnet = "10.50.252.8/29"
  }

  tags = local.tags
}
```

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 4.10.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_common_apim"></a> [common\_apim](#module\_common\_apim) | ./_modules/apim | n/a |
| <a name="module_common_cosmos"></a> [common\_cosmos](#module\_common\_cosmos) | ./_modules/cosmos | n/a |
| <a name="module_common_log_analytics"></a> [common\_log\_analytics](#module\_common\_log\_analytics) | ./_modules/log_analytics | n/a |
| <a name="module_common_storage"></a> [common\_storage](#module\_common\_storage) | ./_modules/storage_account | n/a |
| <a name="module_dns"></a> [dns](#module\_dns) | ./_modules/dns | n/a |
| <a name="module_github_runner"></a> [github\_runner](#module\_github\_runner) | ./_modules/github_runner | n/a |
| <a name="module_key_vault"></a> [key\_vault](#module\_key\_vault) | ./_modules/key_vault | n/a |
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |
| <a name="module_naming_convention_gh_runner"></a> [naming\_convention\_gh\_runner](#module\_naming\_convention\_gh\_runner) | ../azure_naming_convention | n/a |
| <a name="module_nat_gateway"></a> [nat\_gateway](#module\_nat\_gateway) | ./_modules/nat_gateway | n/a |
| <a name="module_network"></a> [network](#module\_network) | ./_modules/networking | n/a |
| <a name="module_vpn"></a> [vpn](#module\_vpn) | ./_modules/vpn | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.network](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_resource_group.test](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | API Management configuration | <pre>object({<br/>    enable = optional(bool, false)<br/>    tier   = optional(string, "s")<br/>    publisher = optional(object({<br/>      email = string<br/>      name  = string<br/>      }), {<br/>      email = "common-dx@pagopa.it"<br/>      name  = "Common DX"<br/>    })<br/>    cidr = optional(string, "10.0.253.0/23")<br/>  })</pre> | <pre>{<br/>  "enable": false<br/>}</pre> | no |
| <a name="input_cosmos"></a> [cosmos](#input\_cosmos) | Cosmos DB configuration | <pre>object({<br/>    enable = optional(bool, false)<br/>    public = optional(bool, false)<br/>  })</pre> | <pre>{<br/>  "enable": false<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_gh_runner_snet"></a> [gh\_runner\_snet](#input\_gh\_runner\_snet) | GitHub runner subnet cidr | `string` | `"10.0.242.0/23"` | no |
| <a name="input_nat_enabled"></a> [nat\_enabled](#input\_nat\_enabled) | Flag to enable nat gateway creation | `bool` | `false` | no |
| <a name="input_pep_subnet_cidr"></a> [pep\_subnet\_cidr](#input\_pep\_subnet\_cidr) | CIDR block for the private endpoint subnet | `string` | `"10.0.2.0/23"` | no |
| <a name="input_storage"></a> [storage](#input\_storage) | Storage configuration | <pre>object({<br/>    enable      = optional(bool, false)<br/>    tier        = optional(string, "s")<br/>    subservices = optional(list(string), ["blob"])<br/>  })</pre> | <pre>{<br/>  "enable": false<br/>}</pre> | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_test_enabled"></a> [test\_enabled](#input\_test\_enabled) | Flag to enable testing resources | `bool` | `false` | no |
| <a name="input_virtual_network_cidr"></a> [virtual\_network\_cidr](#input\_virtual\_network\_cidr) | CIDR block for the virtual network | `string` | `"10.0.0.0/16"` | no |
| <a name="input_vpn"></a> [vpn](#input\_vpn) | VPN configuration. Both 'cidr\_subnet' and 'dnsforwarder\_cidr\_subnet' must be specified together or not at all. | <pre>object({<br/>    cidr_subnet              = optional(string, "")<br/>    dnsforwarder_cidr_subnet = optional(string, "")<br/>  })</pre> | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_common_apim"></a> [common\_apim](#output\_common\_apim) | n/a |
| <a name="output_common_cosmos"></a> [common\_cosmos](#output\_common\_cosmos) | n/a |
| <a name="output_common_key_vault"></a> [common\_key\_vault](#output\_common\_key\_vault) | n/a |
| <a name="output_common_nat_gateways"></a> [common\_nat\_gateways](#output\_common\_nat\_gateways) | n/a |
| <a name="output_common_pep_snet"></a> [common\_pep\_snet](#output\_common\_pep\_snet) | n/a |
| <a name="output_common_resource_group_name"></a> [common\_resource\_group\_name](#output\_common\_resource\_group\_name) | n/a |
| <a name="output_common_storage"></a> [common\_storage](#output\_common\_storage) | n/a |
| <a name="output_common_vnet"></a> [common\_vnet](#output\_common\_vnet) | n/a |
| <a name="output_github_runner"></a> [github\_runner](#output\_github\_runner) | n/a |
| <a name="output_network_resource_group_name"></a> [network\_resource\_group\_name](#output\_network\_resource\_group\_name) | n/a |
| <a name="output_test_resource_group_name"></a> [test\_resource\_group\_name](#output\_test\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
