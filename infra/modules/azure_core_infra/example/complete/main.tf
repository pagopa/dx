module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 2.3"

  test_enabled = true # set to false if you want to create all resources

  environment = local.environment

  virtual_network_cidr = "10.50.0.0/16"

  tags = local.tags
}
