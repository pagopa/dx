resource "azurerm_cosmosdb_account" "this" {
  name                      = "${local.app_name_prefix}-cosno-${var.environment.instance_number}"
  location                  = var.environment.location
  resource_group_name       = var.resource_group_name
  offer_type                = "Standard"
  kind                      = "GlobalDocumentDB"
  automatic_failover_enabled = var.automatic_failover_enabled
  key_vault_key_id          = var.key_vault_key_id
  public_network_access_enabled = var.force_public_network_access_enabled

  geo_location {
    location          = var.main_geo_location_location
    failover_priority = 0
    zone_redundant    = var.main_geo_location_zone_redundant
  }

  dynamic "geo_location" {
    for_each = var.additional_geo_locations

    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.failover_priority
      zone_redundant    = geo_location.value.zone_redundant
    }
  }

  consistency_policy {
    consistency_level       = var.consistency_policy.consistency_level
    max_interval_in_seconds = var.consistency_policy.max_interval_in_seconds
    max_staleness_prefix    = var.consistency_policy.max_staleness_prefix
  }

  dynamic "capabilities" {
    for_each = var.capabilities

    content {
      name = capabilities.value
    }
  }

  dynamic "backup" {
    for_each = var.backup_continuous_enabled ? ["dummy"] : []
    content {
      type = "Continuous"
    }
  }

  dynamic "backup" {
    for_each = var.backup_periodic_enabled != null ? ["dummy"] : []

    content {
      type                = "Periodic"
      interval_in_minutes = var.backup_periodic_enabled.interval_in_minutes
      retention_in_hours  = var.backup_periodic_enabled.retention_in_hours
      storage_redundancy  = var.backup_periodic_enabled.storage_redundancy
    }
  }

  identity {
    type = var.customer_managed_key.enabled ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.customer_managed_key.enabled ? [var.customer_managed_key.user_assigned_identity_id] : null
  }

  tags = var.tags
}

#
# Private endpoints
#
resource "azurerm_private_endpoint" "sql" {
  name                = "${local.app_name_prefix}-cosno-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.app_name_prefix}-cosno-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_cosmosdb_account.this.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

   private_dns_zone_group {
      name                 = "private-dns-zone-group"
      private_dns_zone_ids = [data.azurerm_private_dns_zone.cosmos.id]
  }
}
