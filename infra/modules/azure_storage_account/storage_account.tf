#tfsec:ignore:azure-storage-queue-services-logging-enabled
resource "azurerm_storage_account" "this" {
  name                             = replace("${local.app_name_prefix}-st-${var.environment.instance_number}", "-", "")
  resource_group_name              = var.resource_group_name
  location                         = var.location
  account_kind                     = "StorageV2"
  account_tier                     = var.account_tier
  account_replication_type         = var.account_replication_type
  access_tier                      = var.access_tier
  public_network_access_enabled    = var.force_public_network_access_enabled

  blob_properties {
    versioning_enabled            = var.blob_properties.versioning
    change_feed_enabled           = var.change_feed
    change_feed_retention_in_days = var.change_feed_retention_in_days
    last_access_time_enabled      = var.last_access_time

    dynamic "delete_retention_policy" {
      for_each = (var.delete_retention_days == 0 ? [] : [1])
      content {
          days = var.delete_retention_days
      }
    }

    dynamic "container_delete_retention_policy" {
      for_each = (var.container_delete_retention_days == 0 ? [] : [1])
      content {
          days = var.container_delete_retention_days
      }
    }

    dynamic "restore_policy" {
      for_each = (var.blob_storage_policy.blob_restore_policy_days == 0 ? [] : [1])
      content {
          days = var.blob_storage_policy.blob_restore_policy_days
      }
    }
  }

  dynamic "static_website" {
    for_each = var.index_document != null && var.error_404_document != null ? ["dummy"] : []

    content {
      index_document     = var.index_document
      error_404_document = var.error_404_document
    }
  }

  dynamic "custom_domain" {
    for_each = var.custom_domain.name != null ? ["dummy"] : []

    content {
      name          = var.custom_domain.name
      use_subdomain = var.custom_domain.use_subdomain
    }
  }

  identity {
      type = var.customer_managed_key.enabled ? "SystemAssigned, UserAssigned" : "SystemAssigned"
      identity_ids = var.customer_managed_key.enabled ? [var.customer_managed_key.user_assigned_identity_id] : null
  }

  dynamic "customer_managed_key" {
    for_each = (var.customer_managed_key.enabled && var.customer_managed_key.type == "hsm" ? [1] : [])
    content {
      user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
      managed_hsm_key_id = var.customer_managed_key.managed_hsm_key_id
    }
  }

  dynamic "customer_managed_key" {
    for_each = (var.customer_managed_key.enabled && var.customer_managed_key.type == "kv" ? [1] : [])
    content {
      user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
      key_vault_key_id = var.customer_managed_key.key_vault_key_id
    }
  }

  dynamic "immutability_policy" {
    for_each = var.blob_storage_policy.enable_immutability_policy ? [1] : []

    content {
      allow_protected_append_writes = var.immutability_policy_props.allow_protected_append_writes
      state                         = "Unlocked"
      period_since_creation_in_days = var.immutability_policy_props.period_since_creation_in_days
    }
  }

  # the use of storage_account_customer_managed_key resource will cause a bug on the plan: this paramenter will always see as changed.
  # the state property is ignored because is overridden from a null_resource.
  lifecycle {
    ignore_changes = [
      immutability_policy.0.state
    ]
  }

  tags = var.tags
}

resource "azurerm_security_center_storage_defender" "this" {
  count = var.advanced_threat_protection == true ? 1 : 0
  storage_account_id = azurerm_storage_account.this.id
}