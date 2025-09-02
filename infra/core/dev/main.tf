module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 2.0"

  environment = local.environment

  nat_enabled  = false
  vpn_enabled  = true
  test_enabled = true

  virtual_network_cidr = "10.51.0.0/16"

  tags = local.tags
}


module "core_aws" {
  source = "../../modules/aws_core_infra"

  environment = local.aws_environment
  vpc_cidr = "10.51.0.0/16"
  nat_gateway_count = 0

  tags = local.tags
}
