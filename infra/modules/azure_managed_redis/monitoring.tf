resource "azurerm_monitor_diagnostic_setting" "this" {
  count = try(var.diagnostic_settings.enabled, false) ? 1 : 0

  name               = "${azurerm_managed_redis.this.name}-diagnostics"
  target_resource_id = azurerm_managed_redis.this.id

  log_analytics_workspace_id = try(var.diagnostic_settings.log_analytics_workspace_id, null)
  storage_account_id         = try(var.diagnostic_settings.diagnostic_setting_destination_storage_id, null)

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
