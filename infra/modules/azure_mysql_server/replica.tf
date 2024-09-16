#------------------------------------#
# MySQL Flexible Server Replica #
#------------------------------------#

resource "azurerm_mysql_flexible_server" "replica" {
  count = var.tier == "premium" ? 1 : 0

  name                = local.db.replica_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  version             = var.db_version

  # Network
  private_dns_zone_id = data.azurerm_private_dns_zone.mysql_dns_zone.id

  # Backup
  create_mode = "Replica"
  zone        = var.replica_zone

  sku_name         = local.db.sku_name
  source_server_id = azurerm_mysql_flexible_server.this.id

  maintenance_window {
    day_of_week  = 3
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags
}

#-----------------#
# Monitor Metrics #
#-----------------#

resource "azurerm_monitor_metric_alert" "replica" {
  for_each = local.replica_metric_alerts

  enabled             = var.alerts_enabled
  name                = "${local.db.replica_name}-${upper(each.key)}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_mysql_flexible_server.replica[0].id]
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  severity            = each.value.severity

  dynamic "action" {
    for_each = var.alert_action
    content {
      action_group_id    = action.value["action_group_id"]
      webhook_properties = action.value["webhook_properties"]
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

resource "azurerm_monitor_diagnostic_setting" "replica" {
  count                      = var.tier == "premium" && var.diagnostic_settings.enabled ? 1 : 0
  name                       = "LogSecurity"
  target_resource_id         = azurerm_mysql_flexible_server.replica[0].id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category = "MySQLLogs"
  }

  metric {
    category = "AllMetrics"
    enabled  = false
  }
}