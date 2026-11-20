data "aws_availability_zones" "available" {
  state = "available"
}

module "aws" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name                 = "${local.aws_environment.prefix}-${local.aws_environment.env_short}-vpn-example"
  cidr                 = local.aws.vpc_cidr
  azs                  = slice(data.aws_availability_zones.available.names, 0, 3)
  public_subnets       = [for index in range(3) : cidrsubnet(local.aws.vpc_cidr, 8, index)]
  private_subnets      = [for index in range(3) : cidrsubnet(local.aws.vpc_cidr, 8, index + 3)]
  enable_dns_hostnames = true
  enable_nat_gateway   = true
  single_nat_gateway   = true

  tags = local.tags
}

module "vpn" {
  source  = "pagopa-dx/aws-azure-vpn/aws"
  version = "~> 4.0"

  environment = {
    prefix          = local.azure_environment.prefix
    env_short       = local.azure_environment.env_short
    app_name        = "example"
    instance_number = "01"
  }

  use_case = "development" # "development" | "high_availability"

  aws = {
    region               = local.aws_environment.region
    vpc_id               = module.aws.vpc_id
    vpc_cidr             = local.aws.vpc_cidr
    route_table_ids      = module.aws.private_route_table_ids
    private_subnet_ids   = module.aws.private_subnets
    private_subnet_cidrs = module.aws.private_subnets_cidr_blocks
  }

  azure = var.azure

  tags = local.tags
}