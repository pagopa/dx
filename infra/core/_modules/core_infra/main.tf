module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 1.0"

  test_enabled = false

  environment = var.environment

  virtual_network_cidr = var.virtual_network_cidr
  pep_subnet_cidr      = module.cidrs.network_cidr_blocks.pep
  gh_runner_snet       = module.cidrs.network_cidr_blocks.gh_runner

  vpn = {
    cidr_subnet              = module.cidrs.network_cidr_blocks.vpn
    dnsforwarder_cidr_subnet = module.cidrs.network_cidr_blocks.vpn_dnsforwarder
  }

  nat_enabled = var.nat_enabled

  tags = var.tags
}

resource "azurerm_resource_group" "opex_dev" {
  name     = "${local.project}-opex-rg-01"
  location = var.environment.location

  tags = var.tags
}
