# DX - AWS Core Values Exporter

This Terraform module enables the standardized export and sharing of core AWS infrastructure values across projects and environments.  
It is designed to harmonize the configuration of cloud resources by exposing key outputs such as security groups, network details, and shared service endpoints from the main `aws-core-infra` state, making them easily consumable by dependent modules and project-specific stacks.

## Diagram
<!-- START_TF_GRAPH -->
```mermaid
graph LR
  remoteStateCore["Terraform Remote State Core"]
```

<!-- END_TF_GRAPH -->

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [terraform_remote_state.core](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_core_state"></a> [core\_state](#input\_core\_state) | Configuration for accessing the core Terraform state where aws-core-infra module is deployed. | <pre>object({<br/>    bucket         = string<br/>    key            = string<br/>    region         = string<br/>    dynamodb_table = optional(string, null)<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_availability_zones"></a> [availability\_zones](#output\_availability\_zones) | List of availability zones used |
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb\_endpoint\_id](#output\_dynamodb\_endpoint\_id) | The ID of the DynamoDB VPC endpoint |
| <a name="output_internet_gateway_id"></a> [internet\_gateway\_id](#output\_internet\_gateway\_id) | The ID of the Internet Gateway |
| <a name="output_isolated_route_table_ids"></a> [isolated\_route\_table\_ids](#output\_isolated\_route\_table\_ids) | List of IDs of the isolated route tables |
| <a name="output_isolated_subnet_ids"></a> [isolated\_subnet\_ids](#output\_isolated\_subnet\_ids) | List of IDs of the isolated subnets |
| <a name="output_isolated_subnets"></a> [isolated\_subnets](#output\_isolated\_subnets) | Details of isolated subnets including IDs, CIDR blocks, and availability zones |
| <a name="output_nat_gateway_ids"></a> [nat\_gateway\_ids](#output\_nat\_gateway\_ids) | List of IDs of the NAT Gateways |
| <a name="output_nat_gateway_ips"></a> [nat\_gateway\_ips](#output\_nat\_gateway\_ips) | List of Elastic IP addresses assigned to the NAT Gateways |
| <a name="output_private_route_table_ids"></a> [private\_route\_table\_ids](#output\_private\_route\_table\_ids) | List of IDs of the private route tables |
| <a name="output_private_subnet_ids"></a> [private\_subnet\_ids](#output\_private\_subnet\_ids) | List of IDs of the private subnets |
| <a name="output_private_subnets"></a> [private\_subnets](#output\_private\_subnets) | Details of private subnets including IDs, CIDR blocks, and availability zones |
| <a name="output_project"></a> [project](#output\_project) | Project naming convention |
| <a name="output_public_route_table_ids"></a> [public\_route\_table\_ids](#output\_public\_route\_table\_ids) | List of IDs of the public route tables |
| <a name="output_public_subnet_ids"></a> [public\_subnet\_ids](#output\_public\_subnet\_ids) | List of IDs of the public subnets |
| <a name="output_public_subnets"></a> [public\_subnets](#output\_public\_subnets) | Details of public subnets including IDs, CIDR blocks, and availability zones |
| <a name="output_region"></a> [region](#output\_region) | AWS region where resources are created |
| <a name="output_s3_endpoint_id"></a> [s3\_endpoint\_id](#output\_s3\_endpoint\_id) | The ID of the S3 VPC endpoint |
| <a name="output_vpc_cidr_block"></a> [vpc\_cidr\_block](#output\_vpc\_cidr\_block) | The CIDR block of the VPC |
| <a name="output_vpc_endpoints_security_group_id"></a> [vpc\_endpoints\_security\_group\_id](#output\_vpc\_endpoints\_security\_group\_id) | The ID of the security group for VPC endpoints |
| <a name="output_vpc_id"></a> [vpc\_id](#output\_vpc\_id) | The ID of the VPC |
<!-- END_TF_DOCS -->
