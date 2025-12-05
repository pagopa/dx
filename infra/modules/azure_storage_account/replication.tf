resource "azurerm_storage_account" "secondary_replica" {
  count = local.tier_features.secondary_replication ? 1 : 0

  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "${var.environment.app_name}rep",
    resource_type = "storage_account"
  }))

  resource_group_name             = var.resource_group_name
  location                        = var.secondary_location
  account_kind                    = "StorageV2"
  account_tier                    = local.tier_features.account_tier
  account_replication_type        = "LRS"
  access_tier                     = var.access_tier
  public_network_access_enabled   = local.force_public_network_access_enabled
  allow_nested_items_to_be_public = local.force_public_network_access_enabled
  shared_access_key_enabled       = local.tier_features.shared_access_key_enabled

  # Security and compliance settings (same as primary, defined by use case)
  infrastructure_encryption_enabled = local.tier_features.infrastructure_encryption_enabled
  default_to_oauth_authentication   = local.tier_features.default_to_oauth_authentication
  min_tls_version                   = "TLS1_2"
  https_traffic_only_enabled        = true
  cross_tenant_replication_enabled  = false

  blob_properties {
    versioning_enabled = true

    dynamic "delete_retention_policy" {
      for_each = (var.blob_features.delete_retention_days > 0 ? [1] : [])
      content {
        days = var.blob_features.delete_retention_days
      }
    }
  }

  identity {
    type = "SystemAssigned"
  }

  dynamic "immutability_policy" {
    for_each = local.tier_features.immutability_policy || var.blob_features.immutability_policy.enabled ? [1] : []

    content {
      allow_protected_append_writes = var.blob_features.immutability_policy.allow_protected_append_writes
      state                         = local.immutability_policy_state
      period_since_creation_in_days = var.blob_features.immutability_policy.period_since_creation_in_days
    }
  }

  tags = local.tags
}

# Container replication (Geo-replication)
resource "azurerm_storage_container" "replica" {
  for_each = local.tier_features.secondary_replication ? { for c in var.containers : c.name => c } : {}

  name                  = each.value.name
  storage_account_id    = azurerm_storage_account.secondary_replica[0].id
  container_access_type = each.value.access_type
}

# Container-level immutability policies for secondary replica
resource "azurerm_storage_container_immutability_policy" "replica" {
  for_each = local.tier_features.secondary_replication && local.immutability_policy_enabled ? { for c in var.containers : c.name => c if c.immutability_policy != null } : {}

  storage_container_resource_manager_id = azurerm_storage_container.replica[each.key].resource_manager_id
  immutability_period_in_days           = each.value.immutability_policy.period_in_days
  locked                                = each.value.immutability_policy.locked

  protected_append_writes_all_enabled = local.tier_features.immutability_policy && var.blob_features.immutability_policy.allow_protected_append_writes
}

resource "azurerm_storage_object_replication" "geo_replication_policy" {
  count = local.tier_features.secondary_replication && length([for c in var.containers : c.name]) > 0 ? 1 : 0

  source_storage_account_id      = azurerm_storage_account.this.id
  destination_storage_account_id = azurerm_storage_account.secondary_replica[0].id

  dynamic "rules" {
    for_each = toset([for c in var.containers : c.name])
    content {
      source_container_name      = rules.value
      destination_container_name = rules.value
      copy_blobs_created_after   = "Everything"
    }
  }

  depends_on = [
    azurerm_storage_account.this,
    azurerm_storage_account.secondary_replica,
    azurerm_storage_container.this,
    azurerm_storage_container.replica
  ]
}

# Blob lifecycle management policy for Audit (Hot -> Cool -> Cold -> Delete)
## Note: The Archive tier is not available in Italy North, so we use Cold tier instead.
resource "azurerm_storage_management_policy" "secondary_lifecycle_audit" {
  count = var.use_case == "audit" && local.tier_features.secondary_replication ? 1 : 0

  storage_account_id = azurerm_storage_account.secondary_replica[0].id
  rule {
    name    = "audit-log-lifecycle-policy"
    enabled = true

    filters {
      prefix_match = [""] # Apply to all blobs
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        # Tier to Cool after 30 days of inactivity (no modification)
        tier_to_cool_after_days_since_modification_greater_than = 30
        # Tier to Cold after 90 days of inactivity (no modification)
        tier_to_cold_after_days_since_modification_greater_than = 90
        # Delete after configured retention period (same as primary)
        delete_after_days_since_modification_greater_than = var.audit_retention_days
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 30
      }

      version {
        delete_after_days_since_creation = 30
      }
    }
  }
}

# Blob lifecycle management policy for Archive (Any -> Archive)
## Note: The archive access tier can only be set if storage account kind is BlobStorage and replication is LRS.
resource "azurerm_storage_management_policy" "secondary_lifecycle_archive" {
  count = var.use_case == "archive" && local.tier_features.secondary_replication ? 1 : 0

  storage_account_id = azurerm_storage_account.secondary_replica[0].id
  rule {
    name    = "archive-storage-lifecycle-policy"
    enabled = true

    filters {
      prefix_match = [""] # Apply to all blobs
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        # Tier to Archive after 1 day
        tier_to_archive_after_days_since_creation_greater_than = 1
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 180
      }

      version {
        delete_after_days_since_creation = 180
      }
    }
  }
}
