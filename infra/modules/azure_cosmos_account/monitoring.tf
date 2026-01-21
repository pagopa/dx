# Diagnostic Settings

resource "azurerm_monitor_diagnostic_setting" "this" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name                       = "${azurerm_cosmosdb_account.this.name}-diagnostics"
  target_resource_id         = azurerm_cosmosdb_account.this.id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category_group = "allLogs"
  }
}
