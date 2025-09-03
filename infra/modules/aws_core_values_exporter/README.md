# DX - AWS Core Values Exporter

This Terraform module enables the standardized export and sharing of core AWS infrastructure values across projects and environments.  
It is designed to harmonize the configuration of cloud resources by exposing key outputs such as security groups, network details, and shared service endpoints from the main `aws-core-infra` state, making them easily consumable by dependent modules and project-specific stacks.

## Supported Backends

This module supports both **S3** (AWS) and **Azure Storage** backends for Terraform remote state:

- **S3 Backend**: Traditional AWS S3 bucket with optional DynamoDB state locking
- **Azure Storage Backend**: Azure Storage Account containers for state storage

**Auto-Detection**: The backend type is automatically detected based on which fields are populated in the `core_state` variable.

## Usage Examples

### S3 Backend (AWS) - Backward Compatible

```hcl
module "core_values" {
  source = "./aws_core_values_exporter"

  core_state = {
    bucket         = "my-terraform-state-bucket"
    key            = "core/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Azure Storage Backend

```hcl
module "core_values" {
  source = "./aws_core_values_exporter"

  core_state = {
    storage_account_name = "myterraformstate"
    container_name       = "tfstate"
    key                  = "core/terraform.tfstate"
    resource_group_name  = "rg-terraform-state"
  }
}
```

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                   | Version           |
| ------------------------------------------------------ | ----------------- |
| <a name="requirement_aws"></a> [aws](#requirement_aws) | ~> 5.0            |
| <a name="requirement_dx"></a> [dx](#requirement_dx)    | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name                                                                                                                                   | Type        |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [terraform_remote_state.core](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state)       | data source |
| [terraform_remote_state.core_azure](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state) | data source |

## Inputs

| Name                                                            | Description                                                                                              | Type                                                                                                                                                                                                                                                                                                                                                                                                              | Default | Required |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_core_state"></a> [core_state](#input_core_state) | Configuration for accessing the core Terraform state. Supports both S3 (AWS) and Azure Storage backends. | <pre>object({<br/> key = string<br/><br/> # S3 backend configuration (AWS)<br/> bucket = optional(string, null)<br/> region = optional(string, null)<br/> dynamodb_table = optional(string, null)<br/><br/> # Azure Storage backend configuration<br/> storage_account_name = optional(string, null)<br/> container_name = optional(string, null)<br/> resource_group_name = optional(string, null)<br/> })</pre> | n/a     |   yes    |

## Outputs

| Name                                                                                                                                                                             | Description                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| <a name="output_availability_zones"></a> [availability_zones](#output_availability_zones)                                                                                        | List of availability zones used                                                |
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb_endpoint_id](#output_dynamodb_endpoint_id)                                                                                  | The ID of the DynamoDB VPC endpoint                                            |
| <a name="output_github_personal_access_token_ssm_parameter_name"></a> [github_personal_access_token_ssm_parameter_name](#output_github_personal_access_token_ssm_parameter_name) | SSM parameter name for the GitHub personal access token                        |
| <a name="output_internet_gateway_id"></a> [internet_gateway_id](#output_internet_gateway_id)                                                                                     | The ID of the Internet Gateway                                                 |
| <a name="output_isolated_route_table_ids"></a> [isolated_route_table_ids](#output_isolated_route_table_ids)                                                                      | List of IDs of the isolated route tables                                       |
| <a name="output_isolated_subnet_ids"></a> [isolated_subnet_ids](#output_isolated_subnet_ids)                                                                                     | List of IDs of the isolated subnets                                            |
| <a name="output_isolated_subnets"></a> [isolated_subnets](#output_isolated_subnets)                                                                                              | Details of isolated subnets including IDs, CIDR blocks, and availability zones |
| <a name="output_nat_gateway_ids"></a> [nat_gateway_ids](#output_nat_gateway_ids)                                                                                                 | List of IDs of the NAT Gateways                                                |
| <a name="output_nat_gateway_ips"></a> [nat_gateway_ips](#output_nat_gateway_ips)                                                                                                 | List of Elastic IP addresses assigned to the NAT Gateways                      |
| <a name="output_private_route_table_ids"></a> [private_route_table_ids](#output_private_route_table_ids)                                                                         | List of IDs of the private route tables                                        |
| <a name="output_private_subnet_ids"></a> [private_subnet_ids](#output_private_subnet_ids)                                                                                        | List of IDs of the private subnets                                             |
| <a name="output_private_subnets"></a> [private_subnets](#output_private_subnets)                                                                                                 | Details of private subnets including IDs, CIDR blocks, and availability zones  |
| <a name="output_project"></a> [project](#output_project)                                                                                                                         | Project naming convention                                                      |
| <a name="output_public_route_table_ids"></a> [public_route_table_ids](#output_public_route_table_ids)                                                                            | List of IDs of the public route tables                                         |
| <a name="output_public_subnet_ids"></a> [public_subnet_ids](#output_public_subnet_ids)                                                                                           | List of IDs of the public subnets                                              |
| <a name="output_public_subnets"></a> [public_subnets](#output_public_subnets)                                                                                                    | Details of public subnets including IDs, CIDR blocks, and availability zones   |
| <a name="output_region"></a> [region](#output_region)                                                                                                                            | AWS region where resources are created                                         |
| <a name="output_s3_endpoint_id"></a> [s3_endpoint_id](#output_s3_endpoint_id)                                                                                                    | The ID of the S3 VPC endpoint                                                  |
| <a name="output_vpc_cidr_block"></a> [vpc_cidr_block](#output_vpc_cidr_block)                                                                                                    | The CIDR block of the VPC                                                      |
| <a name="output_vpc_endpoints_security_group_id"></a> [vpc_endpoints_security_group_id](#output_vpc_endpoints_security_group_id)                                                 | The ID of the security group for VPC endpoints                                 |
| <a name="output_vpc_id"></a> [vpc_id](#output_vpc_id)                                                                                                                            | The ID of the VPC                                                              |

<!-- END_TF_DOCS -->
