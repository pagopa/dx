terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0"
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

  tags = var.tags
}

resource "azurerm_resource_group" "dashboards" {
  name     = "${local.project}-common-dashboards-rg-01"
  location = var.environment.location

  tags = var.tags
}

# NOTE: Do not create any resource inside this resource group
resource "azurerm_resource_group" "role_assignment" {
  name     = "default-roleassignment-rg"
  location = var.environment.location

  tags = var.tags
}

resource "azurerm_resource_group" "github_managed_identity" {
  name     = "${local.project}-github-id-rg-01"
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
  resource_group_name = azurerm_resource_group.common.name
  vnet_cidr           = var.virtual_network_cidr
  pep_snet_cidr       = var.pep_subnet_cidr

  tags = var.tags
}

module "vpn" {
  source = "./_modules/vpn"

  project                  = local.project
  location                 = var.environment.location
  resource_group_name      = azurerm_resource_group.common.name
  vpn_cidr_subnet          = var.vpn_cidr_subnet
  dnsforwarder_cidr_subnet = var.dnsforwarder_cidr_subnet

  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = var.tags
}

#-----------#
# KEY VAULT #
#-----------#

# Create only the keyvault, check access policies
module "key_vault" {
  source = "./_modules/key_vault"

  project             = local.project
  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  tags = var.tags
}

#-----------#
# DNS ZONES #
#-----------#

module "dns" {
  source = "./_modules/dns"

  # project             = local.project
  # location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  virtual_network = {
    id   = module.network.vnet.id
    name = module.network.vnet.name
  }

  tags = var.tags
}