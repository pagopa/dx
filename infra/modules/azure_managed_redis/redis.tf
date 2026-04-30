resource "azurerm_managed_redis" "this" {
  name                = local.managed_redis_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  sku_name            = local.selected_sku_name

  high_availability_enabled = local.use_case_features.high_availability_enabled
  public_network_access     = local.use_case_features.private_network_enabled ? "Disabled" : "Enabled"

  identity {
    type = "SystemAssigned"
  }

  default_database {
    access_keys_authentication_enabled = false
    client_protocol                    = "Encrypted"
    clustering_policy                  = "OSSCluster"
    eviction_policy                    = "VolatileLRU"

    persistence_redis_database_backup_frequency = local.persistence_frequency
  }

  tags = local.tags
}

resource "azurerm_management_lock" "this" {
  count = local.use_case_features.lock_enabled ? 1 : 0

  name       = "${azurerm_managed_redis.this.name}-lock"
  scope      = azurerm_managed_redis.this.id
  lock_level = "CanNotDelete"
  notes      = "Locked via Terraform"
}
