# Diagnostic Settings for App Service

resource "azurerm_monitor_diagnostic_setting" "this" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name               = "${azurerm_linux_web_app.this.name}-diagnostics"
  target_resource_id = azurerm_linux_web_app.this.id

  log_analytics_workspace_id     = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id             = var.diagnostic_settings.diagnostic_setting_destination_storage_id
  log_analytics_destination_type = "AzureDiagnostics"

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_log {
    category = "AppServiceAppLogs"
  }

  enabled_log {
    category = "AppServiceFileAuditLogs"
  }

  enabled_log {
    category = "AppServiceAuditLogs"
  }

  enabled_log {
    category = "AppServiceIPSecAuditLogs"
  }

  enabled_log {
    category = "AppServicePlatformLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
