# complete

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_tls"></a> [tls](#requirement\_tls) | ~> 4.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_core"></a> [core](#module\_core) | ../../ | n/a |

## Resources

No resources.

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_client_vpn_endpoint_dns_name"></a> [client\_vpn\_endpoint\_dns\_name](#output\_client\_vpn\_endpoint\_dns\_name) | The DNS name of the Client VPN endpoint |
| <a name="output_client_vpn_endpoint_id"></a> [client\_vpn\_endpoint\_id](#output\_client\_vpn\_endpoint\_id) | The ID of the Client VPN endpoint |
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb\_endpoint\_id](#output\_dynamodb\_endpoint\_id) | The ID of the DynamoDB VPC endpoint |
| <a name="output_internet_gateway_id"></a> [internet\_gateway\_id](#output\_internet\_gateway\_id) | The ID of the Internet Gateway |
| <a name="output_isolated_subnet_ids"></a> [isolated\_subnet\_ids](#output\_isolated\_subnet\_ids) | List of IDs of the isolated subnets |
| <a name="output_nat_gateway_ids"></a> [nat\_gateway\_ids](#output\_nat\_gateway\_ids) | List of IDs of the NAT Gateways |
| <a name="output_private_subnet_ids"></a> [private\_subnet\_ids](#output\_private\_subnet\_ids) | List of IDs of the private subnets |
| <a name="output_public_subnet_ids"></a> [public\_subnet\_ids](#output\_public\_subnet\_ids) | List of IDs of the public subnets |
| <a name="output_s3_endpoint_id"></a> [s3\_endpoint\_id](#output\_s3\_endpoint\_id) | The ID of the S3 VPC endpoint |
| <a name="output_vpc_cidr_block"></a> [vpc\_cidr\_block](#output\_vpc\_cidr\_block) | The CIDR block of the VPC |
| <a name="output_vpc_id"></a> [vpc\_id](#output\_vpc\_id) | The ID of the VPC |
<!-- END_TF_DOCS -->
