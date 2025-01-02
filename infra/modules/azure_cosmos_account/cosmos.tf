resource "azurerm_cosmosdb_account" "this" {
  name                          = module.naming_convention.name.cosmos_db_nosql["1"]
  location                      = var.environment.location
  resource_group_name           = var.resource_group_name
  offer_type                    = "Standard" # It is a required field that can only be set to Standard
  kind                          = "GlobalDocumentDB"
  automatic_failover_enabled    = true
  key_vault_key_id              = var.customer_managed_key.enabled ? var.customer_managed_key.key_vault_key_id : null
  public_network_access_enabled = var.force_public_network_access_enabled

  geo_location {
    location          = local.primary_location
    failover_priority = 0
    zone_redundant    = var.primary_geo_location.zone_redundant
  }

  dynamic "geo_location" {
    for_each = var.secondary_geo_locations

    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.failover_priority == null ? index(var.secondary_geo_locations, geo_location) : geo_location.value.failover_priority
      zone_redundant    = geo_location.value.zone_redundant
    }
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

  dynamic "identity" {
    for_each = var.customer_managed_key.enabled ? [1] : []

    content {
      type         = "UserAssigned"
      identity_ids = [var.customer_managed_key.user_assigned_identity_id]
    }
  }

  default_identity_type = var.customer_managed_key.enabled ? "UserAssignedIdentity=${var.customer_managed_key.user_assigned_identity_id}" : "FirstPartyIdentity"

  tags = var.tags
}
