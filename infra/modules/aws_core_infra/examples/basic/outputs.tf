# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.core.vpc_id
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = module.core.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = module.core.private_subnet_ids
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
