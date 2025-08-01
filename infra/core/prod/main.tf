module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 2.0"

  environment = local.environment

  vpn_enabled  = true
  nat_enabled  = true
  test_enabled = false

  virtual_network_cidr = "10.52.0.0/16"

  tags = local.tags
}
