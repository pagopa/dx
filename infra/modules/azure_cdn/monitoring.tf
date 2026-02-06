# Diagnostic Settings for CDN FrontDoor Profile

resource "azurerm_monitor_diagnostic_setting" "this" {
  count = var.diagnostic_settings.enabled ? 1 : 0

  name                       = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_monitor_diagnostic_setting" }))
  target_resource_id         = local.profile_id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
