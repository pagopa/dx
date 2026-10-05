# complete

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                   | Version |
| ------------------------------------------------------ | ------- |
| <a name="requirement_aws"></a> [aws](#requirement_aws) | ~> 5.0  |
| <a name="requirement_tls"></a> [tls](#requirement_tls) | ~> 4.0  |

## Modules

| Name                                            | Source | Version |
| ----------------------------------------------- | ------ | ------- |
| <a name="module_core"></a> [core](#module_core) | ../../ | n/a     |

## Resources

No resources.

## Inputs

No inputs.

## Outputs

| Name                                                                                              | Description                         |
| ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb\_endpoint\_id](#output_dynamodb_endpoint_id) | The ID of the DynamoDB VPC endpoint |
| <a name="output_internet_gateway_id"></a> [internet\_gateway\_id](#output_internet_gateway_id)    | The ID of the Internet Gateway      |
| <a name="output_isolated_subnet_ids"></a> [isolated\_subnet\_ids](#output_isolated_subnet_ids)    | List of IDs of the isolated subnets |
| <a name="output_nat_gateway_ids"></a> [nat\_gateway\_ids](#output_nat_gateway_ids)                | List of IDs of the NAT Gateways     |
| <a name="output_private_subnet_ids"></a> [private\_subnet\_ids](#output_private_subnet_ids)       | List of IDs of the private subnets  |
| <a name="output_public_subnet_ids"></a> [public\_subnet\_ids](#output_public_subnet_ids)          | List of IDs of the public subnets   |
| <a name="output_s3_endpoint_id"></a> [s3\_endpoint\_id](#output_s3_endpoint_id)                   | The ID of the S3 VPC endpoint       |
| <a name="output_vpc_cidr_block"></a> [vpc\_cidr\_block](#output_vpc_cidr_block)                   | The CIDR block of the VPC           |
| <a name="output_vpc_id"></a> [vpc\_id](#output_vpc_id)                                            | The ID of the VPC                   |

<!-- END_TF_DOCS -->
