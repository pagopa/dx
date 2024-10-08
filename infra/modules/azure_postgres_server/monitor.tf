#-----------------#
# Monitor Metrics #
#-----------------#

resource "azurerm_monitor_metric_alert" "this" {
  for_each = local.metric_alerts

  enabled             = var.alerts_enabled
  name                = "${local.db.name}-${upper(each.key)}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.this.id]
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  severity            = each.value.severity

  dynamic "action" {
    for_each = var.alert_action
    content {
      action_group_id = action.value["action_group_id"]
    }
  }

  criteria {
    aggregation      = each.value.aggregation
    metric_namespace = each.value.metric_namespace
    metric_name      = each.value.metric_name
    operator         = each.value.operator
    threshold        = each.value.threshold
  }
}

#---------------------#
# Diagnostic settings #
#---------------------#

resource "azurerm_monitor_diagnostic_setting" "this" {
  count                      = var.diagnostic_settings.enabled ? 1 : 0
  name                       = "LogSecurity"
  target_resource_id         = azurerm_postgresql_flexible_server.this.id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = false
  }
}