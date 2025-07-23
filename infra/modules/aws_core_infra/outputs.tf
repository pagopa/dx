# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.networking.vpc_cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "public_subnets" {
  description = "Details of public subnets including IDs, CIDR blocks, and availability zones"
  value       = module.networking.public_subnets
}

output "private_subnets" {
  description = "Details of private subnets including IDs, CIDR blocks, and availability zones"
  value       = module.networking.private_subnets
}

output "isolated_subnet_ids" {
  description = "List of IDs of the isolated subnets"
  value       = module.networking.isolated_subnet_ids
}

output "isolated_subnets" {
  description = "Details of isolated subnets including IDs, CIDR blocks, and availability zones"
  value       = module.networking.isolated_subnets
}

# Gateway Outputs
output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = module.networking.internet_gateway_id
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = var.nat_gateway_count > 0 ? module.nat_gateway[0].nat_gateway_ids : []
}

output "nat_gateway_ips" {
  description = "List of Elastic IP addresses assigned to the NAT Gateways"
  value       = var.nat_gateway_count > 0 ? module.nat_gateway[0].nat_gateway_ips : []
}

# Route Table Outputs
output "public_route_table_ids" {
  description = "List of IDs of the public route tables"
  value       = module.routing.public_route_table_ids
}

output "private_route_table_ids" {
  description = "List of IDs of the private route tables"
  value       = module.routing.private_route_table_ids
}

output "isolated_route_table_ids" {
  description = "List of IDs of the isolated route tables"
  value       = module.routing.isolated_route_table_ids
}

# VPC Endpoints Outputs
output "s3_endpoint_id" {
  description = "The ID of the S3 VPC endpoint"
  value       = module.vpc_endpoints.s3_endpoint_id
}

output "dynamodb_endpoint_id" {
  description = "The ID of the DynamoDB VPC endpoint"
  value       = module.vpc_endpoints.dynamodb_endpoint_id
}

output "vpc_endpoints_security_group_id" {
  description = "The ID of the security group for VPC endpoints"
  value       = module.vpc_endpoints.vpc_endpoints_security_group_id
}

# General Outputs
output "availability_zones" {
  description = "List of availability zones used"
  value       = local.availability_zones
}

output "region" {
  description = "AWS region where resources are created"
  value       = var.environment.location
}

output "project" {
  description = "Project naming convention"
  value       = local.project
}
