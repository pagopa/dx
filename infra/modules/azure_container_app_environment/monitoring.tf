resource "azurerm_monitor_diagnostic_setting" "cae" {
  name                       = "${azurerm_container_app_environment.this.name}-diagnostics"
  target_resource_id         = azurerm_container_app_environment.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
