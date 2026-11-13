module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 8.0"

  test_enabled = true

  environment = local.environment

  virtual_network_cidr = "10.50.0.0/16"

  tags = local.tags
}
