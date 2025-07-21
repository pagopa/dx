# DX - AWS Core Infrastructure

This Terraform module provisions the core infrastructure required for the initial configuration of an AWS account following DevEx best practices.

## Features

- **High Availability VPC**: Creates a VPC with public, private, and isolated subnets across 3 availability zones
- **Subnet Segmentation**: Public subnets for load balancers, private subnets for applications, and 3 completely isolated subnets for databases (all /24)
- **Internet Connectivity**: Provisions an Internet Gateway for public subnet access and configurable number of NAT Gateways for private subnet outbound connectivity
- **VPN Access**: Configures AWS Client VPN for secure point-to-site remote access
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
- **Client VPN Endpoint** for secure remote access

## Usage Example

For detailed usage examples, refer to the [examples folder](./examples), which includes:

- A [basic example](./examples/basic) that demonstrates a minimal setup suitable for development/testing
- A [complete example](./examples/complete) that demonstrates all features and provisions the core infrastructure

## Usage Scenarios

### Production Environment (High Availability)

```hcl
nat_gateway_count = 3  # One per AZ for maximum availability
vpn_enabled       = true
```

### Development/Staging Environment (Cost Optimized)

```hcl
nat_gateway_count = 1  # Single NAT gateway to reduce costs
vpn_enabled       = false
```

### Test Environment (Minimal Cost)

```hcl
nat_gateway_count = 0  # Disable NAT gateways to save costs
vpn_enabled       = false
```

### Basic Usage Example

```hcl
module "aws_core_infra" {
  source = "github.com/pagopa/dx//infra/modules/aws_core_infra"

  environment = {
    prefix          = "myorg"
    env_short       = "dev"
    location        = "eu-central-1"
    domain          = "core"
    app_name        = "myapp"
    instance_number = "01"
  }

  vpc_cidr          = "10.0.0.0/16"
  nat_gateway_count = 3  # High availability
  vpn_enabled       = true

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
| vpn           | ./\_modules/vpn           | n/a     |

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
| aws_ec2_client_vpn_endpoint | resource |
| aws_security_group          | resource |

## Inputs

| Name              | Description                                                 | Type            | Default         | Required |
| ----------------- | ----------------------------------------------------------- | --------------- | --------------- | :------: |
| environment       | Environment configuration object                            | `object({...})` | n/a             |   yes    |
| tags              | A map of tags to assign to the resources                    | `map(any)`      | n/a             |   yes    |
| vpc_cidr          | The CIDR block defining the IP address range for the VPC    | `string`        | `"10.0.0.0/16"` |    no    |
| nat_gateway_count | Number of NAT gateways to create (0-3). Set to 0 to disable | `number`        | `3`             |    no    |
| vpn_enabled       | A boolean flag to enable or disable the creation of a VPN   | `bool`          | `false`         |    no    |

## Outputs

| Name                         | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| vpc_id                       | The ID of the VPC                                         |
| vpc_cidr_block               | The CIDR block of the VPC                                 |
| public_subnet_ids            | List of IDs of the public subnets                         |
| private_subnet_ids           | List of IDs of the private subnets                        |
| database_subnet_ids          | List of IDs of the database subnets                       |
| internet_gateway_id          | The ID of the Internet Gateway                            |
| nat_gateway_ids              | List of IDs of the NAT Gateways                           |
| nat_gateway_ips              | List of Elastic IP addresses assigned to the NAT Gateways |
| s3_endpoint_id               | The ID of the S3 VPC endpoint                             |
| dynamodb_endpoint_id         | The ID of the DynamoDB VPC endpoint                       |
| client_vpn_endpoint_id       | The ID of the Client VPN endpoint                         |
| client_vpn_endpoint_dns_name | The DNS name of the Client VPN endpoint                   |
| availability_zones           | List of availability zones used                           |
| region                       | AWS region where resources are created                    |

## Important Notes

- **Database Subnets**: Completely isolated subnets with no internet access, perfect for RDS, ElastiCache, and other database services
- **Subnet Allocation**: Uses CIDR ranges 0-2 for public, 3-5 for private, 6-8 for database subnets
- **NAT Gateways**: When `test_enabled` is `true`, NAT Gateways are automatically disabled to reduce costs during testing
- **NAT Gateway Count**: Configure 1-3 NAT gateways to balance high availability and costs. With fewer than 3, private subnets will share NAT gateways using round-robin distribution
- **High Availability**: The module creates resources across 3 availability zones for maximum resilience
- **VPN Certificates**: The module generates self-signed certificates for VPN authentication. In production, consider using proper PKI
- **VPC Endpoints**: Gateway endpoints for S3 and DynamoDB are always enabled as they are free and improve security
- **Subnet Sizing**: Default configuration creates /24 subnets, providing 256 IP addresses per subnet

## Security Considerations

- Private subnets have no direct internet access, routing through NAT Gateways
- Database subnets are completely isolated with no internet access at all
- VPC endpoints provide private connectivity to AWS services
- Client VPN uses certificate-based authentication
- Security groups restrict VPC endpoint access to VPC CIDR only
- Database subnets should be used for RDS, ElastiCache, and other sensitive data stores

## Cost Optimization

- Set `test_enabled = true` during development to skip expensive resources like NAT Gateways
- Configure `nat_gateway_count` based on your needs: 1 for cost savings, 3 for high availability
- VPC endpoints are always enabled as they reduce data transfer costs for S3 and DynamoDB access at no additional charge
- NAT Gateway costs can be significant - consider using 1 NAT Gateway for non-production environments
