module "core" {
  # source  = "pagopa-dx/azure-core-infra/azurerm"
  # version = "~> 1.0"
  source = "../../modules/azure_core_infra"

  environment = local.environment

  vpn_enabled = true
  nat_enabled = true

  virtual_network_cidr = "10.52.0.0/16"

  tags = local.tags
}

moved {
  from = module.core.module.core
  to   = module.core
}

moved {
  from = module.core.module.github_runner.azurerm_subnet.runner_snet
  to   = module.core.module.network.azurerm_subnet.runner_snet
}

moved {
  from = module.core.module.vpn[0].azurerm_subnet.dns_forwarder_snet
  to   = module.core.module.network.azurerm_subnet.dns_forwarder_snet[0]
}

moved {
  from = module.core.module.vpn[0].azurerm_subnet.vpn_snet
  to   = module.core.module.network.azurerm_subnet.vpn_snet[0]
}

moved {
  from = dx_available_subnet_cidr.pep_cidr
  to   = module.core.module.network.dx_available_subnet_cidr.pep_cidr
}

moved {
  from = dx_available_subnet_cidr.runner_cidr
  to   = module.core.module.network.dx_available_subnet_cidr.runner_cidr
}

moved {
  from = dx_available_subnet_cidr.vpn_cidr
  to   = module.core.module.network.dx_available_subnet_cidr.vpn_cidr[0]
}

moved {
  from = dx_available_subnet_cidr.dns_forwarder_cidr
  to   = module.core.module.network.dx_available_subnet_cidr.dns_forwarder_cidr[0]
}

moved {
  from = dx_available_subnet_cidr.test_cidr
  to   = module.core.module.network.dx_available_subnet_cidr.test_cidr[0]
}