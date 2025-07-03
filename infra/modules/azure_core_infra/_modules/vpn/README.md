# vpn

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_dns_forwarder"></a> [dns\_forwarder](#module\_dns\_forwarder) | github.com/pagopa/terraform-azurerm-v4//dns_forwarder | v1.9.0 |
| <a name="module_vpn"></a> [vpn](#module\_vpn) | github.com/pagopa/terraform-azurerm-v4//vpn_gateway | v1.9.0 |

## Resources

| Name | Type |
|------|------|
| [azuread_application.vpn_app](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_dnsforwarder_subnet_id"></a> [dnsforwarder\_subnet\_id](#input\_dnsforwarder\_subnet\_id) | DNS forwarder subnet ID. | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Location | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | env prefix, short environment and short location | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | Tenant ID | `string` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network where to attach private dns zones | <pre>object({<br/>    id   = string<br/>    name = string<br/>  })</pre> | n/a | yes |
| <a name="input_vpn_subnet_id"></a> [vpn\_subnet\_id](#input\_vpn\_subnet\_id) | VPN network subnet ID. | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
