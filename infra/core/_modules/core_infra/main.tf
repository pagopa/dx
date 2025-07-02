module "core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 1.0"

  environment = var.environment

  nat_enabled  = var.nat_enabled
  test_enabled = var.test_enabled

  virtual_network_cidr = var.virtual_network_cidr
  pep_subnet_cidr      = module.cidrs.network_cidr_blocks.pep
  test_subnet_cidr     = var.test_enabled ? module.cidrs.network_cidr_blocks.test : null
  gh_runner_snet       = module.cidrs.network_cidr_blocks.gh_runner

  vpn = {
    cidr_subnet              = module.cidrs.network_cidr_blocks.vpn
    dnsforwarder_cidr_subnet = module.cidrs.network_cidr_blocks.vpn_dnsforwarder
  }

  tags = var.tags
}
