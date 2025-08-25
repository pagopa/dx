resource "azurerm_storage_account" "secondary_replica" {
  count = local.tier_features.secondary_replication ? 1 : 0

  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "${var.environment.app_name}rep",
    resource_type = "storage_account"
  }))

  resource_group_name             = var.resource_group_name
  location                        = var.secondary_location
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  access_tier                     = var.access_tier
  public_network_access_enabled   = local.force_public_network_access_enabled
  allow_nested_items_to_be_public = local.force_public_network_access_enabled
  shared_access_key_enabled       = local.tier_features.shared_access_key_enabled

  blob_properties {
    versioning_enabled            = var.blob_features.versioning
    change_feed_enabled           = var.blob_features.change_feed.enabled
    change_feed_retention_in_days = var.blob_features.change_feed.enabled && var.blob_features.change_feed.retention_in_days > 0 ? var.blob_features.change_feed.retention_in_days : null
    last_access_time_enabled      = var.blob_features.last_access_time

    dynamic "delete_retention_policy" {
      for_each = (var.blob_features.delete_retention_days > 0 ? [1] : [])
      content {
        days = var.blob_features.delete_retention_days
      }
    }

    dynamic "restore_policy" {
      for_each = (var.blob_features.restore_policy_days > 0 ? [1] : [])
      content {
        days = var.blob_features.restore_policy_days
      }
    }
  }

  dynamic "static_website" {
    for_each = var.static_website.enabled ? [1] : []

    content {
      index_document     = var.static_website.index_document
      error_404_document = var.static_website.error_404_document
    }
  }

  dynamic "custom_domain" {
    for_each = var.custom_domain.name != null ? [1] : []

    content {
      name          = var.custom_domain.name
      use_subdomain = var.custom_domain.use_subdomain
    }
  }

  identity {
    type         = var.customer_managed_key.enabled && var.customer_managed_key.user_assigned_identity_id != null ? "SystemAssigned, UserAssigned" : "SystemAssigned"
    identity_ids = var.customer_managed_key.enabled && var.customer_managed_key.user_assigned_identity_id != null ? [var.customer_managed_key.user_assigned_identity_id] : null
  }

  dynamic "immutability_policy" {
    for_each = local.tier_features.immutability_policy || var.blob_features.immutability_policy.enabled ? [1] : []

    content {
      allow_protected_append_writes = var.blob_features.immutability_policy.allow_protected_append_writes
      state                         = "Unlocked"
      period_since_creation_in_days = var.blob_features.immutability_policy.period_since_creation_in_days
    }
  }

  tags = local.tags
}

resource "azurerm_storage_object_replication" "geo_replication_policy" {
  count = local.tier_features.secondary_replication && length(var.replication_container_names) > 0 ? 1 : 0

  source_storage_account_id      = azurerm_storage_account.this.id
  destination_storage_account_id = azurerm_storage_account.secondary_replica[0].id

  dynamic "rules" {
    for_each = toset(var.replication_container_names)
    content {
      source_container_name      = rules.value
      destination_container_name = rules.value
    }
  }

  depends_on = [
    azurerm_storage_account.this,
    azurerm_storage_account.secondary_replica,
  ]
}