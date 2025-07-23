# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.core.vpc_id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.core.vpc_cidr_block
}

# Subnets
output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = module.core.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = module.core.private_subnet_ids
}

output "isolated_subnet_ids" {
  description = "List of IDs of the isolated subnets"
  value       = module.core.isolated_subnet_ids
}

# Gateways
output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = module.core.internet_gateway_id
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = module.core.nat_gateway_ids
}

# VPC Endpoints
output "s3_endpoint_id" {
  description = "The ID of the S3 VPC endpoint"
  value       = module.core.s3_endpoint_id
}

output "dynamodb_endpoint_id" {
  description = "The ID of the DynamoDB VPC endpoint"
  value       = module.core.dynamodb_endpoint_id
}
