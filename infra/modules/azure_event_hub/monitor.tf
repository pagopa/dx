resource "azurerm_monitor_metric_alert" "event_hub_health_check" {
  for_each = var.tier != "test" ? var.metric_alerts : {}

  name                = format("%s-%s", azurerm_eventhub_namespace.this.name, upper(each.key))
  description         = each.value.description
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_eventhub_namespace.this.id]
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  auto_mitigate       = false
  enabled             = true

  dynamic "action" {
    for_each = var.action_group_id != null ? [var.action_group_id] : []

    content {
      action_group_id = each.value
    }
  }

  criteria {
    aggregation      = each.value.aggregation
    metric_namespace = "microsoft.eventhub/namespaces"
    metric_name      = each.value.metric_name
    operator         = each.value.operator
    threshold        = each.value.threshold
  }

  tags = var.tags
}
