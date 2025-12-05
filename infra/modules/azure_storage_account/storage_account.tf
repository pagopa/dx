#tfsec:ignore:azure-storage-queue-services-logging-enabled
resource "azurerm_storage_account" "this" {
  name                            = provider::dx::resource_name(merge(local.naming_config, { resource_type = "storage_account" }))
  resource_group_name             = var.resource_group_name
  location                        = var.environment.location
  account_kind                    = "StorageV2"
  account_tier                    = local.tier_features.account_tier
  account_replication_type        = local.tier_features.replication_type
  access_tier                     = var.access_tier
  public_network_access_enabled   = local.force_public_network_access_enabled
  allow_nested_items_to_be_public = local.force_public_network_access_enabled
  shared_access_key_enabled       = local.tier_features.shared_access_key_enabled

  # Security and compliance settings (defined by use case)
  infrastructure_encryption_enabled = local.tier_features.infrastructure_encryption_enabled
  default_to_oauth_authentication   = local.tier_features.default_to_oauth_authentication
  min_tls_version                   = "TLS1_2"
  https_traffic_only_enabled        = true
  cross_tenant_replication_enabled  = false

  blob_properties {
    versioning_enabled            = local.immutability_policy_enabled ? true : var.blob_features.versioning # `immutability_policy` can't be set when `versioning_enabled` is false
    change_feed_enabled           = local.immutability_policy_enabled ? true : var.blob_features.change_feed.enabled
    change_feed_retention_in_days = var.blob_features.change_feed.enabled && var.blob_features.change_feed.retention_in_days > 0 ? var.blob_features.change_feed.retention_in_days : null
    last_access_time_enabled      = var.blob_features.last_access_time

    dynamic "delete_retention_policy" {
      for_each = (var.blob_features.delete_retention_days > 0 ? [1] : [])
      content {
        days = var.blob_features.delete_retention_days
      }
    }

    dynamic "restore_policy" {
      for_each = (var.blob_features.restore_policy_days > 0 && !local.immutability_policy_enabled) ? [1] : []
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
    for_each = local.immutability_policy_enabled ? [1] : []

    content {
      allow_protected_append_writes = var.blob_features.immutability_policy.allow_protected_append_writes
      state                         = local.immutability_policy_state
      period_since_creation_in_days = var.blob_features.immutability_policy.period_since_creation_in_days
    }
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      customer_managed_key
    ]
  }
}

resource "azurerm_security_center_storage_defender" "this" {
  count              = local.force_public_network_access_enabled || local.tier_features.advanced_threat_protection ? 1 : 0
  storage_account_id = azurerm_storage_account.this.id
}

# Blob lifecycle management policy for Audit (Hot -> Cool -> Cold -> Delete)
resource "azurerm_storage_management_policy" "lifecycle_audit" {
  count = var.use_case == "audit" ? 1 : 0

  storage_account_id = azurerm_storage_account.this.id
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
        # Delete after configured retention period (standard is 365 days / 12 months)
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

# Containers
resource "azurerm_storage_container" "this" {
  for_each = { for c in var.containers : c.name => c }

  name                  = each.value.name
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = each.value.access_type

  metadata = { for k, v in local.tags : lower(k) => lower(v) }
}

# Container-level immutability policies (for granular retention control)
resource "azurerm_storage_container_immutability_policy" "this" {
  for_each = local.immutability_policy_enabled ? { for c in var.containers : c.name => c if c.immutability_policy != null } : {}

  storage_container_resource_manager_id = azurerm_storage_container.this[each.key].resource_manager_id
  immutability_period_in_days           = each.value.immutability_policy.period_in_days
  locked                                = each.value.immutability_policy.locked

  protected_append_writes_all_enabled = local.immutability_policy_enabled && var.blob_features.immutability_policy.allow_protected_append_writes
}

# Tables
resource "azurerm_storage_table" "this" {
  for_each             = var.subservices_enabled.table ? toset(var.tables) : []
  name                 = each.value
  storage_account_name = azurerm_storage_account.this.name
}

# Queues
resource "azurerm_storage_queue" "this" {
  for_each             = var.subservices_enabled.queue ? toset(var.queues) : []
  name                 = each.value
  storage_account_name = azurerm_storage_account.this.name

  metadata = { for k, v in local.tags : lower(k) => lower(v) }
}

# Blob lifecycle management policy for Archive (Any -> Archive)
## Note: The archive access tier can only be set if storage account kind is BlobStorage and replication is LRS.
resource "azurerm_storage_management_policy" "lifecycle_archive" {
  count = var.use_case == "archive" ? 1 : 0

  storage_account_id = azurerm_storage_account.this.id
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
