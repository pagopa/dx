module "private_cosmos_account" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = ">= 0.3"

  environment         = merge(local.environment, { domain = "private" })
  resource_group_name = azurerm_resource_group.e2e_cdb.name

  primary_geo_location = {
    location       = local.environment.location
    zone_redundant = false
  }

  force_public_network_access_enabled = false

  consistency_policy = {
    consistency_preset = "Default"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id

  alerts = {
    enabled = false
  }

  tags = local.tags
}

module "public_cosmos_account" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = ">= 0.3"

  environment         = merge(local.environment, { domain = "public" })
  resource_group_name = azurerm_resource_group.e2e_cdb.name

  primary_geo_location = {
    location       = local.environment.location
    zone_redundant = false
  }

  force_public_network_access_enabled = true

  consistency_policy = {
    consistency_preset = "Default"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id

  alerts = {
    enabled = false
  }

  tags = local.tags
}
