# vpc_endpoints

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_security_group.vpc_endpoints](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group) | resource |
| [aws_vpc_endpoint.dynamodb](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint) | resource |
| [aws_vpc_endpoint.s3](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint) | resource |
| [aws_vpc.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_isolated_route_table_ids"></a> [isolated\_route\_table\_ids](#input\_isolated\_route\_table\_ids) | List of isolated route table IDs for gateway endpoints | `list(string)` | `[]` | no |
| <a name="input_naming_config"></a> [naming\_config](#input\_naming\_config) | Configuration object for generating consistent resource names | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    region          = string<br/>    name            = string<br/>    domain          = optional(string)<br/>    instance_number = number<br/>  })</pre> | n/a | yes |
| <a name="input_private_route_table_ids"></a> [private\_route\_table\_ids](#input\_private\_route\_table\_ids) | List of private route table IDs for gateway endpoints | `list(string)` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | AWS region for service endpoints | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources | `map(any)` | n/a | yes |
| <a name="input_vpc_id"></a> [vpc\_id](#input\_vpc\_id) | The ID of the VPC where endpoints will be created | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb\_endpoint\_id](#output\_dynamodb\_endpoint\_id) | The ID of the DynamoDB VPC endpoint |
| <a name="output_s3_endpoint_id"></a> [s3\_endpoint\_id](#output\_s3\_endpoint\_id) | The ID of the S3 VPC endpoint |
| <a name="output_vpc_endpoints_security_group_id"></a> [vpc\_endpoints\_security\_group\_id](#output\_vpc\_endpoints\_security\_group\_id) | The ID of the security group for VPC endpoints |
<!-- END_TF_DOCS -->
