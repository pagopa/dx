resource "azurerm_managed_redis" "this" {
  name                = local.managed_redis_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  sku_name            = local.selected_sku_name

  high_availability_enabled = local.use_case_features.high_availability_enabled
  public_network_access     = var.force_public_network_access_enabled ? "Enabled" : "Disabled"

  dynamic "identity" {
    for_each = local.effective_identity == null ? [] : [local.effective_identity]

    content {
      type         = identity.value.type
      identity_ids = contains(["UserAssigned", "SystemAssigned, UserAssigned"], identity.value.type) ? identity.value.identity_ids : null
    }
  }

  dynamic "customer_managed_key" {
    for_each = try(var.customer_managed_key.enabled, false) ? [1] : []

    content {
      key_vault_key_id          = var.customer_managed_key.key_vault_key_id
      user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
    }
  }

  default_database {
    access_keys_authentication_enabled = var.access_keys_authentication_enabled
    client_protocol                    = local.selected_database.client_protocol
    clustering_policy                  = local.selected_database.clustering_policy
    eviction_policy                    = local.selected_database.eviction_policy
    geo_replication_group_name         = local.geo_replication_enabled ? var.geo_replication.group_name : null

    persistence_append_only_file_backup_frequency = local.selected_database.persistence_mode == "aof" ? local.selected_database.persistence_frequency : null
    persistence_redis_database_backup_frequency   = local.selected_database.persistence_mode == "rdb" ? local.selected_database.persistence_frequency : null

    dynamic "module" {
      for_each = local.selected_database.modules

      content {
        name = module.value.name
        args = module.value.args
      }
    }
  }

  tags = local.tags

  lifecycle {
    precondition {
      condition = (
        !local.geo_replication_enabled
        || (
          !startswith(local.selected_sku_name, "FlashOptimized_")
          && !contains(["Balanced_B0", "Balanced_B1"], local.selected_sku_name)
        )
      )
      error_message = "Geo-replication requires a non-Flash Azure Managed Redis SKU and Balanced_B3 or higher."
    }
  }
}

resource "azurerm_management_lock" "this" {
  count = local.enable_lock ? 1 : 0

  name       = "${azurerm_managed_redis.this.name}-lock"
  scope      = azurerm_managed_redis.this.id
  lock_level = "CanNotDelete"
  notes      = "Locked via Terraform"
}
