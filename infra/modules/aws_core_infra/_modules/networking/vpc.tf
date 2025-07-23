# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "network"
      resource_type   = "vpc"
      instance_number = var.naming_config.instance_number
    })
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = provider::dx::resource_name({
      prefix          = var.naming_config.prefix
      environment     = var.naming_config.environment
      region          = var.naming_config.location
      domain          = var.naming_config.domain
      name            = "network"
      resource_type   = "internet_gateway"
      instance_number = var.naming_config.instance_number
    })
  })
}
