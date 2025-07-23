# VPC Endpoints module for AWS Core Infrastructure
# Creates VPC endpoints for private access to AWS services without internet routing

# S3 Gateway Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "s3"
      resource_type   = "vpc_endpoint"
      instance_number = var.naming_config.instance_number
    })
  })
}

# DynamoDB Gateway Endpoint
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "dynamodb"
      resource_type   = "vpc_endpoint"
      instance_number = var.naming_config.instance_number
    })
  })
}

# Security Group for Interface Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = provider::dx::resource_name({
    prefix          = var.naming_config.prefix
    environment     = var.naming_config.environment
    region          = var.naming_config.location
    domain          = var.naming_config.domain
    name            = "vpce"
    resource_type   = "security_group"
    instance_number = var.naming_config.instance_number
  })
  description = "Security group for VPC endpoints"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "vpce"
      resource_type   = "security_group"
      instance_number = var.naming_config.instance_number
    })
  })
}

# Data source for VPC information
data "aws_vpc" "main" {
  id = var.vpc_id
}
