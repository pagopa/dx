terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

#------------------------#
# COMMON RESOURCE GROUPS #
#------------------------#
resource "azurerm_resource_group" "common" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "common",
      domain        = "",
      resource_type = "resource_group",
  }))
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "network",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "gh_runner" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "github-runner",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "test" {
  count = var.test_enabled ? 1 : 0

  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "test",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

#------------#
# NETWORKING #
#------------#

module "network" {
  source = "./_modules/networking"

  naming_config       = local.naming_config
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name
  vnet_cidr           = var.virtual_network_cidr
  pep_snet_cidr       = var.pep_subnet_cidr

  tags = local.tags
}

module "nat_gateway" {
  count  = local.nat_enabled ? 1 : 0
  source = "./_modules/nat_gateway"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name

  tags = local.tags

  depends_on = [module.network]
}

module "vpn" {
  count = local.vpn_enabled ? 1 : 0

  source = "./_modules/vpn"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  vpn_cidr_subnet          = var.vpn.cidr_subnet
  dnsforwarder_cidr_subnet = var.vpn.dnsforwarder_cidr_subnet

  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = local.tags
}

#-----------#
# KEY VAULT #
#-----------#

module "key_vault" {
  source = "./_modules/key_vault"

  naming_config = merge(local.naming_config, { name = var.environment.app_name })

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  subnet_pep_id = module.network.pep_snet.id
  private_dns_zone = {
    id                  = module.dns.private_dns_zones.vault.id
    resource_group_name = azurerm_resource_group.network.name
  }

  tags = local.tags
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

  tags = local.tags
}

#------#
# LOGS #
#------#

module "common_log_analytics" {
  source = "./_modules/log_analytics"

  naming_config = local.naming_config

  resource_group_name = azurerm_resource_group.common.name
  location            = var.environment.location

  tags = local.tags
}

#---------------#
# GITHUB RUNNER #
#---------------#

module "github_runner" {
  source = "./_modules/github_runner"

  naming_config = local.naming_config

  resource_group_name = azurerm_resource_group.gh_runner.name
  location            = var.environment.location
  virtual_network = {
    id                  = module.network.vnet.id
    name                = module.network.vnet.name
    resource_group_name = azurerm_resource_group.network.name
  }
  subnet_cidr = var.gh_runner_snet

  log_analytics_workspace_id = module.common_log_analytics.id

  tags = local.tags
}
