#------------#
# Core Infra #
#------------#

module "core" {
  source = "../.."

  test_enabled = true

  environment = local.environment

  virtual_network_cidr = "10.60.0.0/16"
  pep_subnet_cidr      = "10.60.1.0/23"

  vpn = {
    cidr_subnet              = "10.60.133.0/24"
    dnsforwarder_cidr_subnet = "10.60.252.8/29"
  }

  tags = local.tags
}

#----------------#
# API Management #
#----------------#

resource "azurerm_subnet" "apim" {
  name                 = "${module.naming_convention.project}-apim-snet-${local.environment.instance_number}"
  virtual_network_name = module.core.common_vnet.name
  resource_group_name  = module.core.network_resource_group_name
  address_prefixes     = ["10.60.2.0/24"]
}

module "apim" {
  source  = "pagopa/dx-azure-api-management/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  tier                = "s"

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
  source  = "pagopa/dx-azure-cosmos-account/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

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
  source  = "pagopa/dx-azure-storage-account/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

  subnet_pep_id                       = module.core.common_pep_snet.id
  force_public_network_access_enabled = false

  tier = "s"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}