locals {
  project = module.naming_convention.project
  prefix  = module.naming_convention.prefix
  suffix  = module.naming_convention.suffix

  vpn_enable = var.vpn.cidr_subnet != "" && var.vpn.dnsforwarder_cidr_subnet != ""
}