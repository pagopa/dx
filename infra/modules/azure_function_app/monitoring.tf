# Diagnostic Settings for Function App

resource "azurerm_monitor_diagnostic_setting" "this" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name                       = "${azurerm_linux_function_app.this.name}-diagnostics"
  target_resource_id         = azurerm_linux_function_app.this.id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category = "FunctionAppLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

# Diagnostic Settings for Function App Slot

resource "azurerm_monitor_diagnostic_setting" "slot" {
  count = var.diagnostic_settings.enabled && local.use_case_features.slot ? 1 : 0

  name                       = "${azurerm_linux_function_app_slot.this[0].name}-diagnostics"
  target_resource_id         = azurerm_linux_function_app_slot.this[0].id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category = "FunctionAppLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
