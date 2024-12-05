#tfsec:ignore:azure-storage-queue-services-logging-enabled
resource "azurerm_storage_account" "this" {
  name                          = replace("${module.naming_convention.prefix}-st-${module.naming_convention.suffix}", "-", "")
  resource_group_name           = var.resource_group_name
  location                      = var.environment.location
  account_kind                  = "StorageV2"
  account_tier                  = local.tier_features.account_tier
  account_replication_type      = local.tier_features.replication_type
  access_tier                   = var.access_tier
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

resource "azurerm_storage_account_customer_managed_key" "kv" {
  for_each                  = (var.customer_managed_key.enabled && var.customer_managed_key.type == "kv" ? { type = var.customer_managed_key.type } : {})
  storage_account_id        = azurerm_storage_account.this.id
  key_vault_id              = var.customer_managed_key.key_vault_key_id
  key_name                  = var.customer_managed_key.key_name
  user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
}

resource "azurerm_storage_queue" "this" {
  count = length(var.queue_names)

  name                 = var.queue_names[count.index]
  storage_account_name = azurerm_storage_account.this.name
}