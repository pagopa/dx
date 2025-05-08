# -----------------------------------------------
# Alerts
# -----------------------------------------------

resource "azurerm_monitor_metric_alert" "cosmos_db_provisioned_throughput_exceeded" {
  count = var.alerts.enabled ? 1 : 0

  name                = "[${azurerm_cosmosdb_account.this.name}] Provisioned Throughput Exceeded"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_cosmosdb_account.this.id]
  description         = "A collection throughput (RU/s) exceed provisioned throughput, and it's raising 429 errors. Please, consider to increase RU. Runbook: not needed."
  severity            = 0
  window_size         = "PT5M"
  frequency           = "PT5M"
  auto_mitigate       = false


  # Metric info
  # https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/metrics-supported#microsoftdocumentdbdatabaseaccounts
  criteria {
    metric_namespace       = "Microsoft.DocumentDB/databaseAccounts"
    metric_name            = "TotalRequestUnits"
    aggregation            = "Total"
    operator               = "GreaterThan"
    threshold              = var.alerts.thresholds.provisioned_throughput_exceeded
    skip_metric_validation = false


    dimension {
      name     = "Region"
      operator = "Include"
      values   = [local.primary_location]
    }
    dimension {
      name     = "StatusCode"
      operator = "Include"
      values   = ["429"]
    }
    dimension {
      name     = "CollectionName"
      operator = "Include"
      values   = ["*"]
    }

  }

  dynamic "action" {
    for_each = var.alerts.action_group_id == null ? [] : [1]
    content {
      action_group_id = var.alerts.action_group_id
    }
  }

  tags = local.tags
}
