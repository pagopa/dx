#------------#
# Core Infra #
#------------#

module "core" {
  source = "../.."

  test_enabled = true

  environment = local.environment

  virtual_network_cidr = "10.60.0.0/16"

  tags = local.tags
}

#----------------#
# API Management #
#----------------#

resource "azurerm_subnet" "apim" {
  name = provider::dx::resource_name(merge({
    resource_type   = "apim_subnet",
    instance_number = 1,
  }, local.naming_config))
  virtual_network_name = module.core.common_vnet.name
  resource_group_name  = module.core.network_resource_group_name
  address_prefixes     = ["10.60.2.0/24"]
}

module "apim" {
  source = "../../../azure_api_management"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  use_case            = "cost_optimized"

  publisher_email = "common-dx@pagopa.it"
  publisher_name  = "Common DX"

  virtual_network = {
    name                = module.core.common_vnet.name
    resource_group_name = module.core.network_resource_group_name
  }

  subnet_id                     = azurerm_subnet.apim.id
  virtual_network_type_internal = true
  enable_public_network_access  = true

  tags = local.tags
}

#-----------#
# Cosmos DB #
#-----------#

## Cosmos Account
module "cosmos" {
  source = "../../../azure_cosmos_account"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  use_case            = "default"

  subnet_pep_id = module.core.common_pep_snet.id

  private_dns_zone_resource_group_name = module.core.network_resource_group_name

  force_public_network_access_enabled = true

  consistency_policy = {
    consistency_preset = "Default"
  }

  alerts = {
    enabled = false
  }

  tags = local.tags
}

## Cosmos Database
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = module.cosmos.resource_group_name
  account_name        = module.cosmos.name
}

#-----------------#
# Storage Account #
#-----------------#

module "storage_account" {
  source = "../../../azure_storage_account"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

  subnet_pep_id                       = module.core.common_pep_snet.id
  force_public_network_access_enabled = false

  use_case = "default"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}
