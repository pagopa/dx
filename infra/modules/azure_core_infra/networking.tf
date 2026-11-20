module "network" {
  source = "./modules/networking"

  naming_config       = local.naming_config
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name
  vnet_cidr           = var.virtual_network_cidr
  test_enabled        = var.test_enabled
  vpn_enabled         = var.vpn_enabled

  tags = local.tags
}

module "nat_gateway" {
  count  = local.nat_enabled ? 1 : 0
  source = "./modules/nat_gateway"

  project             = local.project
  location            = var.environment.location
  instance_number     = var.environment.instance_number
  resource_group_name = azurerm_resource_group.network.name

  tags = local.tags

  depends_on = [module.network]
}

module "vpn" {
  count = var.vpn_enabled || var.cross_cloud_dns_enabled ? 1 : 0

  source = "./modules/vpn"

  prefix              = var.environment.prefix
  project             = local.project
  location            = var.environment.location
  instance_number     = var.environment.instance_number
  resource_group_name = azurerm_resource_group.network.name
  env_short           = var.environment.env_short
  naming_config       = local.naming_config

  tenant_id = data.azurerm_client_config.current.tenant_id

  vpn_subnet_id          = module.network.vpn_snet.id
  dnsforwarder_subnet_id = module.network.dns_forwarder_snet.id

  vpn_enabled  = var.vpn_enabled
  vpn_use_case = var.vpn_use_case

  # Cross-cloud DNS configuration
  cross_cloud_dns_enabled = var.cross_cloud_dns_enabled

  tags = local.tags
}


module "dns" {
  source = "./modules/dns"

  resource_group_name = azurerm_resource_group.network.name
  private_dns_zones   = local.private_dns_zones
  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = local.tags
}
