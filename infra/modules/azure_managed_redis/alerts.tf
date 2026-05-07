resource "azurerm_monitor_metric_alert" "this" {
  for_each = local.metric_alerts

  name                = "${azurerm_managed_redis.this.name}-${replace(each.key, "_", "-")}"
  description         = each.value.description
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_managed_redis.this.id]
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  severity            = each.value.severity
  auto_mitigate       = false
  enabled             = true

  dynamic "action" {
    for_each = try(var.alerts.action_group_id, null) == null ? [] : [1]

    content {
      action_group_id = var.alerts.action_group_id
    }
  }

  criteria {
    aggregation      = each.value.aggregation
    metric_namespace = each.value.metric_namespace
    metric_name      = each.value.metric_name
    operator         = each.value.operator
    threshold        = each.value.threshold
  }

  tags = local.tags
}
