# Diagnostic Settings for App Configuration
# Logs configuration operations and metrics
resource "azurerm_monitor_diagnostic_setting" "app_configuration" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name               = "${azurerm_app_configuration.this.name}-diagnostics"
  target_resource_id = azurerm_app_configuration.this.id

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
