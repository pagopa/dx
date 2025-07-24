# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name          = "network"
      resource_type = "vpc"
    }))
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      name          = "network"
      resource_type = "internet_gateway"
    }))
  })
}
