# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = local.core_outputs.values.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = local.core_outputs.values.vpc_cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = local.core_outputs.values.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = local.core_outputs.values.private_subnet_ids
}

output "public_subnets" {
  description = "Details of public subnets including IDs, CIDR blocks, and availability zones"
  value       = local.core_outputs.values.public_subnets
}

output "private_subnets" {
  description = "Details of private subnets including IDs, CIDR blocks, and availability zones"
  value       = local.core_outputs.values.private_subnets
}

output "isolated_subnet_ids" {
  description = "List of IDs of the isolated subnets"
  value       = local.core_outputs.values.isolated_subnet_ids
}

output "isolated_subnets" {
  description = "Details of isolated subnets including IDs, CIDR blocks, and availability zones"
  value       = local.core_outputs.values.isolated_subnets
}

# Gateway Outputs
output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = local.core_outputs.values.internet_gateway_id
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = local.core_outputs.values.nat_gateway_ids
}

output "nat_gateway_ips" {
  description = "List of Elastic IP addresses assigned to the NAT Gateways"
  value       = local.core_outputs.values.nat_gateway_ips
}

# Route Table Outputs
output "public_route_table_ids" {
  description = "List of IDs of the public route tables"
  value       = local.core_outputs.values.public_route_table_ids
}

output "private_route_table_ids" {
  description = "List of IDs of the private route tables"
  value       = local.core_outputs.values.private_route_table_ids
}

output "isolated_route_table_ids" {
  description = "List of IDs of the isolated route tables"
  value       = local.core_outputs.values.isolated_route_table_ids
}

# VPC Endpoints Outputs
output "s3_endpoint_id" {
  description = "The ID of the S3 VPC endpoint"
  value       = local.core_outputs.values.s3_endpoint_id
}

output "dynamodb_endpoint_id" {
  description = "The ID of the DynamoDB VPC endpoint"
  value       = local.core_outputs.values.dynamodb_endpoint_id
}

output "vpc_endpoints_security_group_id" {
  description = "The ID of the security group for VPC endpoints"
  value       = local.core_outputs.values.vpc_endpoints_security_group_id
}

# General Outputs
output "availability_zones" {
  description = "List of availability zones used"
  value       = local.core_outputs.values.availability_zones
}

output "region" {
  description = "AWS region where resources are created"
  value       = local.core_outputs.values.region
}

output "project" {
  description = "Project naming convention"
  value       = local.core_outputs.values.project
}

output "github_personal_access_token_ssm_parameter_name" {
  description = "SSM parameter name for the GitHub personal access token"
  value       = data.terraform_remote_state.core.outputs.values.github_personal_access_token_ssm_parameter_name
}
