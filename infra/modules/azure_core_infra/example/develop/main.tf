## Cosmos Account
module "cosmos" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~> 3.0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  use_case            = "development"

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
