#tfsec:ignore:azure-storage-queue-services-logging-enabled
resource "azurerm_storage_account" "this" {
  name                          = replace("${var.prefix}-st-${var.suffix}", "-", "")
  resource_group_name           = var.resource_group_name
  location                      = var.location
  account_kind                  = "StorageV2"
  account_tier                  = local.tier_features.account_tier
  account_replication_type      = local.tier_features.replication_type
  access_tier                   = "Hot"
  public_network_access_enabled = var.force_public_network_access_enabled

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

  identity {
    type         = "SystemAssigned"
    identity_ids = null
  }

  dynamic "immutability_policy" {
    for_each = var.blob_features.immutability_policy.enabled ? [1] : []

    content {
      allow_protected_append_writes = var.blob_features.immutability_policy.allow_protected_append_writes
      state                         = "Unlocked"
      period_since_creation_in_days = var.blob_features.immutability_policy.period_since_creation_in_days
    }
  }

  tags = var.tags
}

resource "azurerm_security_center_storage_defender" "this" {
  count              = local.tier_features.advanced_threat_protection ? 1 : 0
  storage_account_id = azurerm_storage_account.this.id
}