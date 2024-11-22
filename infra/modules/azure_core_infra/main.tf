terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 4.10.0"
    }
  }
}

module "naming_convention" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

#------------------------#
# COMMON RESOURCE GROUPS #
#------------------------#
resource "azurerm_resource_group" "common" {
  name     = "${local.project}-common-rg-01"
  location = var.environment.location

  tags = local.tags_core
}

resource "azurerm_resource_group" "network" {
  name     = "${local.project}-network-rg-01"
  location = var.environment.location

  tags = local.tags_core
}

resource "azurerm_resource_group" "test" {
  count = var.test_enabled ? 1 : 0

  name     = "${local.project}-test-rg-01"
  location = var.environment.location

  tags = local.tags_dev
}

#------------#
# NETWORKING #
#------------#

module "network" {
  source = "./_modules/networking"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name
  vnet_cidr           = var.virtual_network_cidr
  pep_snet_cidr       = var.pep_subnet_cidr

  tags = local.tags_core
}

module "nat_gateway" {
  count  = !var.test_enabled ? 1 : 0
  source = "./_modules/nat_gateway"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name

  tags = local.tags_core

  depends_on = [module.network]
}

module "vpn" {
  count = local.vpn_enable ? 1 : 0

  source = "./_modules/vpn"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name

  tenant_id = data.azurerm_client_config.current.tenant_id
  object_id = data.azuread_client_config.current.object_id

  vpn_cidr_subnet          = var.vpn.cidr_subnet
  dnsforwarder_cidr_subnet = var.vpn.dnsforwarder_cidr_subnet

  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = local.tags_core
}

#-----------#
# KEY VAULT #
#-----------#

module "key_vault" {
  source = "./_modules/key_vault"

  project = local.project
  prefix  = local.prefix
  suffix  = local.suffix

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  subnet_pep_id = module.network.pep_snet.id
  private_dns_zone = {
    id                  = module.dns.private_dns_zones.vault.id
    resource_group_name = azurerm_resource_group.network.name
  }

  tags = local.tags_core
}

#-----------#
# DNS ZONES #
#-----------#

module "dns" {
  source = "./_modules/dns"

  resource_group_name = azurerm_resource_group.network.name
  private_dns_zones   = local.private_dns_zones
  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = local.tags_core
}