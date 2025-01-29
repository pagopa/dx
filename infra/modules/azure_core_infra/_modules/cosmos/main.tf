resource "azurerm_cosmosdb_account" "this" {
  name                          = "${var.prefix}-cosno-${var.suffix}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  offer_type                    = "Standard" # It is a required field that can only be set to Standard
  kind                          = "GlobalDocumentDB"
  automatic_failover_enabled    = true
  key_vault_key_id              = null
  public_network_access_enabled = var.force_public_network_access_enabled

  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = true
  }

  consistency_policy {
    consistency_level = local.final_consistency_policy.consistency_level

    # Only apply these fields if the consistency_level is "BoundedStaleness"
    max_interval_in_seconds = local.final_consistency_policy.consistency_level == "BoundedStaleness" ? local.final_consistency_policy.max_interval_in_seconds : null
    max_staleness_prefix    = local.final_consistency_policy.consistency_level == "BoundedStaleness" ? local.final_consistency_policy.max_staleness_prefix : null
  }

  # As suggested by technology https://pagopa.atlassian.net/wiki/spaces/DEVOPS/pages/500039691/Cosmos+DB#backup-policy
  backup {
    type = "Continuous"
    tier = "Continuous30Days"
  }

  default_identity_type = "FirstPartyIdentity"

  tags = var.tags
}

resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name
}