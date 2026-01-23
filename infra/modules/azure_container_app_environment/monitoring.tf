# Diagnostic Settings for Container App Environment
# Logs environment-level logs and metrics
resource "azurerm_monitor_diagnostic_setting" "container_app_environment" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name               = "${azurerm_container_app_environment.this.name}-diagnostics"
  target_resource_id = azurerm_container_app_environment.this.id

  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.storage_account_id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
