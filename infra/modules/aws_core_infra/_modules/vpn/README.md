# vpn

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_tls"></a> [tls](#requirement\_tls) | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_acm_certificate.vpn_client](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate) | resource |
| [aws_acm_certificate.vpn_server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate) | resource |
| [aws_ec2_client_vpn_authorization_rule.internet_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule) | resource |
| [aws_ec2_client_vpn_authorization_rule.vpc_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule) | resource |
| [aws_ec2_client_vpn_endpoint.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint) | resource |
| [aws_ec2_client_vpn_network_association.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_network_association) | resource |
| [aws_ec2_client_vpn_route.internet_route](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_route) | resource |
| [aws_ec2_client_vpn_route.vpc_route](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_route) | resource |
| [tls_private_key.vpn_client](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key) | resource |
| [tls_private_key.vpn_server](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key) | resource |
| [tls_self_signed_cert.vpn_client](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert) | resource |
| [tls_self_signed_cert.vpn_server](https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_client_cidr_block"></a> [client\_cidr\_block](#input\_client\_cidr\_block) | CIDR block for VPN client connections | `string` | `"172.16.0.0/16"` | no |
| <a name="input_naming_config"></a> [naming\_config](#input\_naming\_config) | Configuration object for generating consistent resource names | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    instance_number = number<br/>  })</pre> | n/a | yes |
| <a name="input_public_subnet_ids"></a> [public\_subnet\_ids](#input\_public\_subnet\_ids) | List of public subnet IDs for VPN endpoint association | `list(string)` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources | `map(any)` | n/a | yes |
| <a name="input_vpc_cidr"></a> [vpc\_cidr](#input\_vpc\_cidr) | CIDR block of the VPC | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_client_vpn_endpoint_dns_name"></a> [client\_vpn\_endpoint\_dns\_name](#output\_client\_vpn\_endpoint\_dns\_name) | The DNS name of the Client VPN endpoint |
| <a name="output_client_vpn_endpoint_id"></a> [client\_vpn\_endpoint\_id](#output\_client\_vpn\_endpoint\_id) | The ID of the Client VPN endpoint |
| <a name="output_vpn_client_certificate_arn"></a> [vpn\_client\_certificate\_arn](#output\_vpn\_client\_certificate\_arn) | ARN of the VPN client certificate |
| <a name="output_vpn_client_configuration"></a> [vpn\_client\_configuration](#output\_vpn\_client\_configuration) | VPN client configuration download URL |
| <a name="output_vpn_server_certificate_arn"></a> [vpn\_server\_certificate\_arn](#output\_vpn\_server\_certificate\_arn) | ARN of the VPN server certificate |
<!-- END_TF_DOCS -->
