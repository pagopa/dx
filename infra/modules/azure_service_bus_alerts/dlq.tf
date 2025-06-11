resource "azurerm_monitor_metric_alert" "dlq" {
  count = var.alerts_on_dlq_messages == null ? 0 : 1

  name                     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "monitor_alert_sbns_dlq" }))
  resource_group_name      = local.resource_group_name
  enabled                  = var.alerts_on_dlq_messages != null
  description              = var.alerts_on_dlq_messages.description
  severity                 = local.dlq_severity
  target_resource_type     = "Microsoft.ServiceBus/namespaces"
  target_resource_location = var.environment.location

  scopes = [
    var.service_bus_namespace_id
  ]

  frequency     = var.alerts_on_dlq_messages.check_every
  window_size   = var.alerts_on_dlq_messages.lookback_period
  auto_mitigate = var.alerts_on_dlq_messages.auto_mitigate

  criteria {
    metric_namespace       = "Microsoft.ServiceBus/namespaces"
    metric_name            = "DeadletteredMessages"
    aggregation            = "Average"
    operator               = "GreaterThan"
    skip_metric_validation = false
    threshold              = var.alerts_on_dlq_messages.threshold

    dynamic "dimension" {
      for_each = var.alerts_on_dlq_messages.entity_names

      content {
        name     = "EntityName"
        operator = "Include"
        values   = [dimension.value]
      }
    }
  }

  dynamic "action" {
    for_each = var.action_group_ids

    content {
      action_group_id = action.value
    }
  }

  tags = local.tags
}
