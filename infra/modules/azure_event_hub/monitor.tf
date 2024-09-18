resource "azurerm_monitor_metric_alert" "event_hub_health_check" {
  count = var.tier == "test" ? 0 : 1

  name                = local.eventhub.alert
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_eventhub_namespace.this.id]
  description         = "Event Hub namespace availability is under threshold level. Runbook: -"
  severity            = 1
  frequency           = "PT5M"
  auto_mitigate       = false
  enabled             = true

  criteria {
    metric_namespace = "microsoft.eventhub/namespaces"
    metric_name      = "HealthCheckStatus"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 50
  }

  dynamic "action" {
    for_each = var.action_group_id == null ? [] : ["dummy"]
    content {
      action_group_id = var.action_group_id
    }
  }

  tags = var.tags
}