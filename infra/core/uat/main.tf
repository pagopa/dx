module "azure" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 2.0"

  environment = local.azure_environment

  vpn_enabled  = true
  nat_enabled  = true
  test_enabled = false

  virtual_network_cidr = local.azure.vnet_cidr

  tags = local.tags
}

module "aws" {
  source  = "pagopa-dx/aws-core-infra/aws"
  version = "~> 0.0"

  environment       = local.aws_environment
  vpc_cidr          = local.aws.vpc_cidr
  nat_gateway_count = 0

  tags = local.tags
}
