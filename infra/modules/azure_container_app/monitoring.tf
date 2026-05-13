resource "azurerm_monitor_diagnostic_setting" "container_app" {
  count = var.log_analytics_workspace_id == null ? 0 : 1

  name               = "${azurerm_container_app.this.name}-diagnostics"
  target_resource_id = azurerm_container_app.this.id

  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_metric {
    category = "AllMetrics"
  }
}
