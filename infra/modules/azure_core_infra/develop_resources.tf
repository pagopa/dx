#----------------#
# API MANAGEMENT #
#----------------#

module "common_apim" {
  count = var.apim.enable ? 1 : 0

  source = "./_modules/apim"

  project = module.naming_convention.project
  prefix  = module.naming_convention.prefix
  suffix  = module.naming_convention.suffix

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name
  tier                = var.apim.tier == "l" && var.test_enabled ? "m" : var.apim.tier

  publisher_email = var.apim.publisher.email
  publisher_name  = var.apim.publisher.name

  virtual_network = {
    name                = module.network.vnet.name
    resource_group_name = azurerm_resource_group.network.name
  }

  subnet_cidr                   = var.apim.cidr
  virtual_network_type_internal = true
  enable_public_network_access  = true

  tags = var.tags
}

#-----------#
# COSMOS DB #
#-----------#

module "common_cosmos" {
  count = var.cosmos.enable ? 1 : 0

  source = "./_modules/cosmos"

  prefix = module.naming_convention.prefix
  suffix = module.naming_convention.suffix

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  virtual_network = {
    name                = module.network.vnet.name
    resource_group_name = azurerm_resource_group.network.name
  }

  subnet_pep_id = module.network.pep_snet.id

  force_public_network_access_enabled = var.cosmos.public

  consistency_policy = {
    consistency_preset = "Default"
  }

  tags = var.tags
}

#---------#
# STORAGE #
#---------#

module "common_storage" {
  count = var.storage.enable ? 1 : 0

  source = "./_modules/storage_account"

  prefix = module.naming_convention.prefix
  suffix = module.naming_convention.suffix

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  tier                = var.storage.tier == "l" && var.test_enabled ? "s" : var.storage.tier
  subservices_enabled = var.storage.subservices

  virtual_network = {
    name                = module.network.vnet.name
    resource_group_name = azurerm_resource_group.network.name
  }

  subnet_pep_id = module.network.pep_snet.id

  force_public_network_access_enabled = var.cosmos.public

  tags = var.tags
}