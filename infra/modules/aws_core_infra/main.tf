# Main Terraform configuration for AWS Core Infrastructure module
# This module creates a highly opinionated AWS infrastructure setup including:
# - VPC with public and private subnets across 3 AZs
# - Internet Gateway and NAT Gateways for connectivity
# - VPC Endpoints for S3 and DynamoDB

#---------#
# Network #
#---------#

module "networking" {
  source = "./_modules/networking"

  naming_config = local.naming_config
  vpc_cidr      = var.vpc_cidr

  availability_zones    = local.availability_zones
  public_subnet_cidrs   = local.public_subnet_cidrs
  private_subnet_cidrs  = local.private_subnet_cidrs
  isolated_subnet_cidrs = local.isolated_subnet_cidrs

  tags = local.tags
}

#-------------#
# NAT Gateway #
#-------------#

module "nat_gateway" {
  count  = var.nat_gateway_count > 0 ? 1 : 0
  source = "./_modules/nat_gateway"

  naming_config = local.naming_config

  public_subnet_ids = module.networking.public_subnet_ids
  nat_gateway_count = var.nat_gateway_count

  tags = local.tags
}

#----------------#
# Route Tables   #
#----------------#

module "routing" {
  source = "./_modules/routing"

  naming_config = local.naming_config

  vpc_id              = module.networking.vpc_id
  internet_gateway_id = module.networking.internet_gateway_id
  public_subnet_ids   = module.networking.public_subnet_ids
  private_subnet_ids  = module.networking.private_subnet_ids
  isolated_subnet_ids = module.networking.isolated_subnet_ids

  nat_gateway_ids = var.nat_gateway_count > 0 ? module.nat_gateway[0].nat_gateway_ids : []

  tags = local.tags
}

#---------------#
# VPC Endpoints #
#---------------#

module "vpc_endpoints" {
  source = "./_modules/vpc_endpoints"

  naming_config = local.naming_config

  vpc_id                   = module.networking.vpc_id
  region                   = var.environment.region
  private_route_table_ids  = module.routing.private_route_table_ids
  isolated_route_table_ids = module.routing.isolated_route_table_ids

  tags = local.tags
}
