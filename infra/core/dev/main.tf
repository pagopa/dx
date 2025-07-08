module "core" {
  # source  = "pagopa-dx/azure-core-infra/azurerm"
  # version = "~> 2.0"
  source = "github.com/pagopa/dx//infra/modules/azure_core_infra?ref=application-insights-as-core-resource"

  environment = local.environment

  nat_enabled  = false
  vpn_enabled  = true
  test_enabled = true

  virtual_network_cidr = "10.51.0.0/16"

  tags = local.tags
}
