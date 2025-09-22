# VPC
# trivy:ignore:AVD-AWS-0178 VPC Flow Logs disabled intentionally for cost optimization
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      domain        = ""
      name          = "core"
      resource_type = "vpc"
    }))
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = provider::dx::resource_name(merge(var.naming_config, {
      domain        = ""
      name          = "core"
      resource_type = "internet_gateway"
    }))
  })
}
