# dns_resolver_managed

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_private_dns_resolver.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver) | resource |
| [azurerm_private_dns_resolver_dns_forwarding_ruleset.aws](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_dns_forwarding_ruleset) | resource |
| [azurerm_private_dns_resolver_forwarding_rule.aws_domains](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_forwarding_rule) | resource |
| [azurerm_private_dns_resolver_inbound_endpoint.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_inbound_endpoint) | resource |
| [azurerm_private_dns_resolver_outbound_endpoint.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_outbound_endpoint) | resource |
| [azurerm_private_dns_resolver_virtual_network_link.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_resolver_virtual_network_link) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cross_cloud_dns_config"></a> [cross\_cloud\_dns\_config](#input\_cross\_cloud\_dns\_config) | Cross-cloud DNS configuration for AWS Route53 Resolver integration. | <pre>object({<br/>    aws_resolver_inbound_ips = list(string)<br/>    aws_vpc_cidr             = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_inbound_subnet_id"></a> [inbound\_subnet\_id](#input\_inbound\_subnet\_id) | Subnet ID for the inbound endpoint. | `string` | n/a | yes |
| <a name="input_outbound_subnet_id"></a> [outbound\_subnet\_id](#input\_outbound\_subnet\_id) | Subnet ID for the outbound endpoint. | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name where the Private DNS Resolver will be created. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_virtual_network_id"></a> [virtual\_network\_id](#input\_virtual\_network\_id) | Virtual Network ID where the Private DNS Resolver will be created. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dns_forwarding_ruleset_id"></a> [dns\_forwarding\_ruleset\_id](#output\_dns\_forwarding\_ruleset\_id) | DNS forwarding ruleset ID |
| <a name="output_forwarding_rule_ids"></a> [forwarding\_rule\_ids](#output\_forwarding\_rule\_ids) | Map of domain names to forwarding rule IDs |
| <a name="output_inbound_endpoint_id"></a> [inbound\_endpoint\_id](#output\_inbound\_endpoint\_id) | Private DNS Resolver inbound endpoint ID |
| <a name="output_inbound_endpoint_ip"></a> [inbound\_endpoint\_ip](#output\_inbound\_endpoint\_ip) | Private DNS Resolver inbound endpoint IP address |
| <a name="output_outbound_endpoint_id"></a> [outbound\_endpoint\_id](#output\_outbound\_endpoint\_id) | Private DNS Resolver outbound endpoint ID |
| <a name="output_private_dns_resolver_id"></a> [private\_dns\_resolver\_id](#output\_private\_dns\_resolver\_id) | Azure Private DNS Resolver ID |
<!-- END_TF_DOCS -->
