# dns_resolver_managed

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | >= 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_cloudwatch_log_group.resolver_query_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group) | resource |
| [aws_route53_resolver_endpoint.inbound](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint) | resource |
| [aws_route53_resolver_endpoint.outbound](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint) | resource |
| [aws_route53_resolver_query_log_config.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_query_log_config) | resource |
| [aws_route53_resolver_query_log_config_association.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_query_log_config_association) | resource |
| [aws_route53_resolver_rule.azure_zones](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule) | resource |
| [aws_route53_resolver_rule_association.azure_zones](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule_association) | resource |
| [aws_security_group.resolver](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cross_cloud_dns_config"></a> [cross\_cloud\_dns\_config](#input\_cross\_cloud\_dns\_config) | Cross-cloud DNS configuration for Azure Private DNS Resolver integration. | <pre>object({<br/>    azure_resolver_inbound_ip = string<br/>    azure_vnet_cidr           = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_project"></a> [project](#input\_project) | Project name for resource naming. | `string` | n/a | yes |
| <a name="input_subnet_ids"></a> [subnet\_ids](#input\_subnet\_ids) | Subnet IDs for Route53 Resolver endpoints (minimum 2 subnets in different AZs). | `list(string)` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_vpc_cidr"></a> [vpc\_cidr](#input\_vpc\_cidr) | VPC CIDR block for security group rules. | `string` | n/a | yes |
| <a name="input_vpc_id"></a> [vpc\_id](#input\_vpc\_id) | VPC ID where to deploy the Route53 Resolver endpoints. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_inbound_endpoint_id"></a> [inbound\_endpoint\_id](#output\_inbound\_endpoint\_id) | Route53 Resolver inbound endpoint ID |
| <a name="output_inbound_endpoint_ips"></a> [inbound\_endpoint\_ips](#output\_inbound\_endpoint\_ips) | Route53 Resolver inbound endpoint IP addresses |
| <a name="output_outbound_endpoint_id"></a> [outbound\_endpoint\_id](#output\_outbound\_endpoint\_id) | Route53 Resolver outbound endpoint ID |
| <a name="output_outbound_endpoint_ips"></a> [outbound\_endpoint\_ips](#output\_outbound\_endpoint\_ips) | Route53 Resolver outbound endpoint IP addresses |
| <a name="output_query_log_config_id"></a> [query\_log\_config\_id](#output\_query\_log\_config\_id) | Route53 Resolver query log configuration ID |
| <a name="output_resolver_rule_ids"></a> [resolver\_rule\_ids](#output\_resolver\_rule\_ids) | Map of domain names to resolver rule IDs |
| <a name="output_security_group_id"></a> [security\_group\_id](#output\_security\_group\_id) | Security group ID for Route53 Resolver endpoints |
<!-- END_TF_DOCS -->
