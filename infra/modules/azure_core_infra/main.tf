terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 4.10.0"
    }
  }
}

module "naming_convention" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "~> 0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

module "naming_convention_gh_runner" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    app_name        = "github-runner"
    instance_number = var.environment.instance_number
  }
}

#------------------------#
# COMMON RESOURCE GROUPS #
#------------------------#
resource "azurerm_resource_group" "common" {
  name     = "${local.project}-common-rg-01"
  location = var.environment.location

  tags = var.tags
}

resource "azurerm_resource_group" "network" {
  name     = "${local.project}-network-rg-01"
  location = var.environment.location

  tags = var.tags
}

resource "azurerm_resource_group" "gh_runner" {
  name     = "${local.project}-github-runner-rg-01"
  location = var.environment.location

  tags = var.tags
}

resource "azurerm_resource_group" "test" {
  count = var.test_enabled ? 1 : 0

  name     = "${local.project}-test-rg-01"
  location = var.environment.location

  tags = var.tags
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

  tags = var.tags
}

module "nat_gateway" {
  count  = local.nat_enabled ? 1 : 0
  source = "./_modules/nat_gateway"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.network.name

  tags = var.tags

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

  tags = var.tags
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

  tags = var.tags
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

  tags = var.tags
}

#------#
# LOGS #
#------#

module "common_log_analytics" {
  source = "./_modules/log_analytics"

  prefix = local.project
  suffix = local.suffix

  resource_group_name = azurerm_resource_group.common.name
  location            = var.environment.location

  tags = var.tags
}

#---------------#
# GITHUB RUNNER #
#---------------#

module "github_runner" {
  source = "./_modules/github_runner"

  prefix = module.naming_convention_gh_runner.prefix
  suffix = module.naming_convention_gh_runner.suffix

  resource_group_name = azurerm_resource_group.gh_runner.name
  location            = var.environment.location
  virtual_network = {
    id                  = module.network.vnet.id
    name                = module.network.vnet.name
    resource_group_name = azurerm_resource_group.network.name
  }
  subnet_cidr = var.gh_runner_snet

  log_analytics_workspace_id = module.common_log_analytics.id

  tags = var.tags
}