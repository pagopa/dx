#------------------------------------#
# PostgreSQL Flexible Server Replica #
#------------------------------------#

resource "azurerm_postgresql_flexible_server" "replica" {
  count = var.tier == "premium" ? 1 : 0

  name                = local.db.replica_name
  resource_group_name = data.azurerm_resource_group.this.name
  location            = var.environment.location
  version             = var.db_version

  # Network
  delegated_subnet_id           = azurerm_subnet.replica[0].id
  private_dns_zone_id           = azurerm_private_dns_zone_virtual_network_link.replica[0].id
  public_network_access_enabled = false

  # Backup
  create_mode = "Replica"
  zone        = var.replica_zone

  storage_mb = var.storage_mb
  sku_name   = local.db.sku_name

  dynamic "maintenance_window" {
    for_each = var.maintenance_window_config != null ? ["dummy"] : []

    content {
      day_of_week  = var.maintenance_window_config.day_of_week
      start_hour   = var.maintenance_window_config.start_hour
      start_minute = var.maintenance_window_config.start_minute
    }
  }

  tags = var.tags
}

#-----------------------------#
# Configure: Enable PgBouncer #
#-----------------------------#

resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer_replica" {
  count = var.tier == "premium" && var.pgbouncer_enabled ? 1 : 0

  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.replica[0].id
  value     = "True"
}

#------------#
# Networking #
#------------#

resource "azurerm_subnet" "replica" {
  count = var.tier == "premium" ? 1 : 0

  name                 = "${local.project}-ps-replica-snet-${var.environment.instance_number}"
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.this.name
  address_prefixes     = [var.subnet_cidr]

  service_endpoints = var.subnet_service_endpoints != null ? concat(
    var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
    var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
    var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
  ) : []

  delegation {
    name = "delegation"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "replica" {
  count = var.tier == "premium" ? 1 : 0

  name                  = "${local.project}-ps-replica-link"
  private_dns_zone_name = azurerm_private_dns_zone.this.name

  resource_group_name = data.azurerm_resource_group.vnet_rg.name
  virtual_network_id  = data.azurerm_virtual_network.this.id

  registration_enabled = false

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
  count                      = var.tier == "premium" ? 1 : 0 && var.diagnostic_settings.enabled ? 1 : 0
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