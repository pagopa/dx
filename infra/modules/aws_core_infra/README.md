# DX - AWS Core Infrastructure

This Terraform module provisions the core infrastructure required for the initial configuration of an AWS account following DevEx best practices.

## Features

- **High Availability VPC**: Creates a VPC with public, private, and isolated subnets across 3 availability zones
- **Subnet Segmentation**: Public subnets for load balancers, private subnets for applications, and 3 completely isolated subnets for databases (all /24)
- **Internet Connectivity**: Provisions an Internet Gateway for public subnet access and configurable number of NAT Gateways for private subnet outbound connectivity
- **VPC Endpoints**: Provides private connectivity to AWS services (S3 and DynamoDB) without internet routing - always enabled as they are free
- **Cost Optimization**: Configurable number of NAT Gateways (1-3) to balance high availability and costs
- **Opinionated Design**: Reduces cognitive load with sensible defaults while maintaining configurability for essential parameters

## Architecture

The module creates the following infrastructure components:

- **VPC** with configurable CIDR block
- **3 Public Subnets** (one per AZ, /24 each) with Internet Gateway routing
- **3 Private Subnets** (one per AZ, /24 each) with NAT Gateway routing
- **3 Isolated Subnets** (one per AZ, /24 each) completely isolated with no internet access
- **Internet Gateway** for public internet access
- **NAT Gateways** (configurable 1-3) for private subnet internet access with cost optimization
- **VPC Endpoints** for S3 and DynamoDB services (always enabled - free)

## Usage Example

For detailed usage examples, refer to the [examples folder](./examples), which includes:

- A [basic example](./examples/basic) that demonstrates a minimal setup suitable for development/testing
- A [complete example](./examples/complete) that demonstrates all features and provisions the core infrastructure

## Usage Scenarios

### Production Environment (High Availability)

```hcl
nat_gateway_count = 3  # One per AZ for maximum availability
```

### Development/Staging Environment (Cost Optimized)

```hcl
nat_gateway_count = 1  # Single NAT gateway to reduce costs
```

### Test Environment (Minimal Cost)

```hcl
nat_gateway_count = 0  # Disable NAT gateways to save costs
```

### Basic Usage Example

```hcl
module "aws_core_infra" {
  source = "github.com/pagopa/dx//infra/modules/aws_core_infra"

  environment = {
    prefix          = "myorg"
    env_short       = "dev"
    region        = "eu-central-1"
    domain          = "core"
    app_name        = "myapp"
    instance_number = "01"
  }

  vpc_cidr          = "10.0.0.0/16"
  nat_gateway_count = 3  # High availability

  tags = {
    Environment = "dev"
    Owner       = "DevOps"
  }
}
```

## Requirements

| Name      | Version |
| --------- | ------- |
| terraform | >= 1.0  |
| aws       | ~> 5.0  |
| tls       | ~> 4.0  |

## Providers

| Name | Version |
| ---- | ------- |
| aws  | ~> 5.0  |
| tls  | ~> 4.0  |

## Modules

| Name          | Source                    | Version |
| ------------- | ------------------------- | ------- |
| networking    | ./\_modules/networking    | n/a     |
| nat_gateway   | ./\_modules/nat_gateway   | n/a     |
| routing       | ./\_modules/routing       | n/a     |
| vpc_endpoints | ./\_modules/vpc_endpoints | n/a     |

## Resources

| Name                        | Type     |
| --------------------------- | -------- |
| aws_vpc                     | resource |
| aws_internet_gateway        | resource |
| aws_subnet                  | resource |
| aws_nat_gateway             | resource |
| aws_eip                     | resource |
| aws_route_table             | resource |
| aws_route                   | resource |
| aws_route_table_association | resource |
| aws_vpc_endpoint            | resource |
| aws_security_group          | resource |

## Inputs

| Name              | Description                                                 | Type            | Default         | Required |
| ----------------- | ----------------------------------------------------------- | --------------- | --------------- | :------: |
| environment       | Environment configuration object                            | `object({...})` | n/a             |   yes    |
| tags              | A map of tags to assign to the resources                    | `map(any)`      | n/a             |   yes    |
| vpc_cidr          | The CIDR block defining the IP address range for the VPC    | `string`        | `"10.0.0.0/16"` |    no    |
| nat_gateway_count | Number of NAT gateways to create (0-3). Set to 0 to disable | `number`        | `3`             |    no    |

## Outputs

| Name                 | Description                                               |
| -------------------- | --------------------------------------------------------- |
| vpc_id               | The ID of the VPC                                         |
| vpc_cidr_block       | The CIDR block of the VPC                                 |
| public_subnet_ids    | List of IDs of the public subnets                         |
| private_subnet_ids   | List of IDs of the private subnets                        |
| isolated_subnet_ids  | List of IDs of the database subnets                       |
| internet_gateway_id  | The ID of the Internet Gateway                            |
| nat_gateway_ids      | List of IDs of the NAT Gateways                           |
| nat_gateway_ips      | List of Elastic IP addresses assigned to the NAT Gateways |
| s3_endpoint_id       | The ID of the S3 VPC endpoint                             |
| dynamodb_endpoint_id | The ID of the DynamoDB VPC endpoint                       |
| availability_zones   | List of availability zones used                           |
| region               | AWS region where resources are created                    |

## GitHub Personal Access Token Configuration

This module creates an SSM parameter named `/core/github/personal_access_token` that must be manually populated with a fine-grained GitHub Personal Access Token (PAT) from a bot user.

### Required Permissions

The GitHub PAT must have the following permissions to work with AWS CodeBuild:

- **Contents: Read-only**: Grants access to private repositories. This permission is required if you are using private repositories as source.

- **Commit statuses: Read and write**: Grants permission to create commit statuses. This permission is required if your project has webhook set up, or you have report build status feature enabled.

- **Webhooks: Read and write**: Grants permission to manage webhooks. This permission is required if your project has webhook set up.

- **Pull requests: Read-only**: Grants permission to access pull requests. This permission is required if your webhook has a FILE_PATH filter on pull request events.

- **Administration: Read and write**: This permission is required if you are using the self-hosted GitHub Actions runner feature with CodeBuild. For more details, see Create a registration token for a repository and Tutorial: Configure a CodeBuild-hosted GitHub Actions runner.

### Setup Instructions

1. Create a GitHub bot user account (recommended for security)
2. Generate a fine-grained Personal Access Token with the permissions listed above
3. After applying this Terraform module, update the SSM parameter value:
   ```bash
   aws ssm put-parameter \
     --name "/core/github/personal_access_token" \
     --value "your-github-pat-here" \
     --type "SecureString" \
     --overwrite
   ```

## Important Notes

- **Database Subnets**: Completely isolated subnets with no internet access, perfect for RDS, ElastiCache, and other database services
- **Subnet Allocation**: Uses CIDR ranges 0-2 for public, 3-5 for private, 6-8 for database subnets
- **NAT Gateways**: When `nat_gateway_count` is set to `0`, NAT Gateways are automatically disabled to reduce costs during testing
- **NAT Gateway Count**: Configure 1-3 NAT gateways to balance high availability and costs. With fewer than 3, private subnets will share NAT gateways using round-robin distribution
- **High Availability**: The module creates resources across 3 availability zones for maximum resilience
- **VPC Endpoints**: Gateway endpoints for S3 and DynamoDB are always enabled as they are free and improve security
- **Subnet Sizing**: Default configuration creates /24 subnets, providing 256 IP addresses per subnet

## Security Considerations

- Private subnets have no direct internet access, routing through NAT Gateways
- Database subnets are completely isolated with no internet access at all
- VPC endpoints provide private connectivity to AWS services
- Security groups restrict VPC endpoint access to VPC CIDR only
- Database subnets should be used for RDS, ElastiCache, and other sensitive data stores

## Cost Optimization

- Set `nat_gateway_count = 0` during development to skip expensive resources like NAT Gateways
- Configure `nat_gateway_count` based on your needs: 1 for cost savings, 3 for high availability
- VPC endpoints are always enabled as they reduce data transfer costs for S3 and DynamoDB access at no additional charge
- NAT Gateway costs can be significant - consider using 1 NAT Gateway for non-production environments

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.0 |
| <a name="requirement_github"></a> [github](#requirement\_github) | ~> 6.0 |
| <a name="requirement_tls"></a> [tls](#requirement\_tls) | ~> 4.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_nat_gateway"></a> [nat\_gateway](#module\_nat\_gateway) | ./_modules/nat_gateway | n/a |
| <a name="module_networking"></a> [networking](#module\_networking) | ./_modules/networking | n/a |
| <a name="module_routing"></a> [routing](#module\_routing) | ./_modules/routing | n/a |
| <a name="module_vpc_endpoints"></a> [vpc\_endpoints](#module\_vpc\_endpoints) | ./_modules/vpc_endpoints | n/a |

## Resources

| Name | Type |
|------|------|
| [aws_ssm_parameter.personal_access_token](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter) | resource |
| [aws_availability_zones.available](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_nat_gateway_count"></a> [nat\_gateway\_count](#input\_nat\_gateway\_count) | Number of NAT gateways to create. Set to 0 to disable NAT gateways, 1 for development environment, 3 for high availability in production environment. | `number` | `3` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_vpc_cidr"></a> [vpc\_cidr](#input\_vpc\_cidr) | The CIDR block defining the IP address range for the VPC. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_availability_zones"></a> [availability\_zones](#output\_availability\_zones) | List of availability zones used |
| <a name="output_dynamodb_endpoint_id"></a> [dynamodb\_endpoint\_id](#output\_dynamodb\_endpoint\_id) | The ID of the DynamoDB VPC endpoint |
| <a name="output_github_personal_access_token_ssm_parameter_name"></a> [github\_personal\_access\_token\_ssm\_parameter\_name](#output\_github\_personal\_access\_token\_ssm\_parameter\_name) | SSM parameter name for the GitHub personal access token |
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
