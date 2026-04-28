resource "azurerm_monitor_diagnostic_setting" "this" {
  count = local.use_case_features.diagnostics_enabled ? 1 : 0

  name                       = "${azurerm_managed_redis.this.name}-diagnostics"
  target_resource_id         = azurerm_managed_redis.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_metric {
    category = "AllMetrics"
  }
}
