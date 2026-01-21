# Diagnostic Settings for Container App
# Logs application logs, system logs, and metrics
resource "azurerm_monitor_diagnostic_setting" "container_app" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name               = "${azurerm_container_app.this.name}-diagnostics"
  target_resource_id = azurerm_container_app.this.id

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
