#------------------------------------#
# PostgreSQL Flexible Server Replica #
#------------------------------------#

resource "azurerm_postgresql_flexible_server" "replica" {
  count = var.tier == "l" ? 1 : 0

  name                = local.db.replica_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  version             = var.db_version

  # Network
  public_network_access_enabled = false

  # Backup
  create_mode      = "Replica"
  source_server_id = azurerm_postgresql_flexible_server.this.id
  zone             = var.replica_zone

  storage_mb = var.storage_mb
  sku_name   = local.db.sku_name

  maintenance_window {
    day_of_week  = 3
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_virtual_endpoint" "endpoint" {
  count = var.tier == "l" ? 1 : 0

  name              = "${local.db_name_prefix}-psql-endpoint-${var.environment.instance_number}"
  source_server_id  = azurerm_postgresql_flexible_server.this.id
  replica_server_id = azurerm_postgresql_flexible_server.replica[0].id
  type              = "ReadWrite"
}

#-----------------------------#
# Configure: Enable PgBouncer #
#-----------------------------#

resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer_replica" {
  count = var.tier == "l" && var.pgbouncer_enabled ? 1 : 0

  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.replica[0].id
  value     = "True"
}

#-----------------#
# Monitor Metrics #
#-----------------#

resource "azurerm_monitor_metric_alert" "replica" {
  for_each = local.replica_metric_alerts

  enabled             = var.alerts_enabled
  name                = "${local.db.replica_name}-${upper(each.key)}"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_postgresql_flexible_server.replica[0].id]
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
  count                      = var.tier == "l" && var.diagnostic_settings.enabled ? 1 : 0
  name                       = "LogSecurity"
  target_resource_id         = azurerm_postgresql_flexible_server.replica[0].id
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