# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-vpc${var.naming_config.instance_number}"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.naming_config.prefix}-${var.naming_config.environment}-${var.naming_config.location}-igw${var.naming_config.instance_number}"
  })
}
