module "azure" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 2.0"

  environment = local.azure_environment

  nat_enabled  = false
  vpn_enabled  = true
  test_enabled = true

  virtual_network_cidr = "10.51.0.0/16"


  tags = local.tags
}

module "aws" {
  source  = "pagopa-dx/aws-core-infra/aws"
  version = "~> 0.0"

  environment       = local.aws_environment
  vpc_cidr          = "10.0.0.0/16"
  nat_gateway_count = 0

  tags = local.tags
}
