# vpn

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.0 |

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
| <a name="input_cross_cloud_dns_config"></a> [cross\_cloud\_dns\_config](#input\_cross\_cloud\_dns\_config) | Cross-cloud DNS configuration for AWS integration. Required when cross\_cloud\_dns\_enabled is true. | <pre>object({<br/>    aws_coredns_ip = string<br/>    aws_vpc_cidr   = string<br/>  })</pre> | <pre>{<br/>  "aws_coredns_ip": "",<br/>  "aws_vpc_cidr": ""<br/>}</pre> | no |
| <a name="input_cross_cloud_dns_enabled"></a> [cross\_cloud\_dns\_enabled](#input\_cross\_cloud\_dns\_enabled) | Enable cross-cloud DNS resolution with AWS. | `bool` | `false` | no |
| <a name="input_dnsforwarder_subnet_id"></a> [dnsforwarder\_subnet\_id](#input\_dnsforwarder\_subnet\_id) | DNS forwarder subnet ID. | `string` | n/a | yes |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Environment in short form where resources are located | `string` | n/a | yes |
| <a name="input_instance_number"></a> [instance\_number](#input\_instance\_number) | The instance number of the resource, used to differentiate multiple instances of the same resource type within the same project and environment. | `string` | n/a | yes |
| <a name="input_location"></a> [location](#input\_location) | Location | `string` | n/a | yes |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | Project prefix | `string` | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | Env prefix, short environment and short location | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | Tenant ID | `string` | n/a | yes |
| <a name="input_vpn_subnet_id"></a> [vpn\_subnet\_id](#input\_vpn\_subnet\_id) | VPN network subnet ID. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dns_forwarder_endpoint"></a> [dns\_forwarder\_endpoint](#output\_dns\_forwarder\_endpoint) | DNS forwarder endpoint |
| <a name="output_dns_forwarder_private_ip"></a> [dns\_forwarder\_private\_ip](#output\_dns\_forwarder\_private\_ip) | DNS forwarder private IP address |
<!-- END_TF_DOCS -->
