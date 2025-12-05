# Diagnostic Settings for Storage Account (Control Plane)
# Logs management operations: StorageRead, StorageWrite, StorageDelete
resource "azurerm_monitor_diagnostic_setting" "storage_account" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name               = "${azurerm_storage_account.this.name}-diagnostics"
  target_resource_id = azurerm_storage_account.this.id

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  enabled_metric {
    category = "AllMetrics"
  }
}

# Diagnostic Settings for Blob Service (Data Plane)
# Logs blob read/write/delete operations at the data plane level
resource "azurerm_monitor_diagnostic_setting" "blob_service" {
  count = var.diagnostic_settings.enabled && var.subservices_enabled.blob ? 1 : 0

  name               = "${azurerm_storage_account.this.name}-blob-diagnostics"
  target_resource_id = "${azurerm_storage_account.this.id}/blobServices/default"

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  dynamic "enabled_log" {
    for_each = toset(local.monitoring_logs)
    content {
      category = enabled_log.value
    }
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# Diagnostic Settings for File Service (Data Plane)
# Logs file share read/write/delete operations
resource "azurerm_monitor_diagnostic_setting" "file_service" {
  count = var.diagnostic_settings.enabled && var.subservices_enabled.file ? 1 : 0

  name               = "${azurerm_storage_account.this.name}-file-diagnostics"
  target_resource_id = "${azurerm_storage_account.this.id}/fileServices/default"

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  dynamic "enabled_log" {
    for_each = toset(local.monitoring_logs)
    content {
      category = enabled_log.value
    }
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# Diagnostic Settings for Queue Service (Data Plane)
# Logs queue message operations
resource "azurerm_monitor_diagnostic_setting" "queue_service" {
  count = var.diagnostic_settings.enabled && var.subservices_enabled.queue ? 1 : 0

  name               = "${azurerm_storage_account.this.name}-queue-diagnostics"
  target_resource_id = "${azurerm_storage_account.this.id}/queueServices/default"

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  dynamic "enabled_log" {
    for_each = toset(local.monitoring_logs)
    content {
      category = enabled_log.value
    }
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# Diagnostic Settings for Table Service (Data Plane)
# Logs table entity operations
resource "azurerm_monitor_diagnostic_setting" "table_service" {
  count = var.diagnostic_settings.enabled && var.subservices_enabled.table ? 1 : 0

  name               = "${azurerm_storage_account.this.name}-table-diagnostics"
  target_resource_id = "${azurerm_storage_account.this.id}/tableServices/default"

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  dynamic "enabled_log" {
    for_each = toset(local.monitoring_logs)
    content {
      category = enabled_log.value
    }
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
