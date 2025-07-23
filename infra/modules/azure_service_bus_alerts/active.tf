resource "azurerm_monitor_metric_alert" "active" {
  count = var.alerts_on_active_messages == null ? 0 : 1

  name                     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "monitor_alert_sbns_active" }))
  resource_group_name      = local.resource_group_name
  enabled                  = var.alerts_on_active_messages != null
  description              = var.alerts_on_active_messages.description
  severity                 = local.active_severity
  target_resource_type     = "Microsoft.ServiceBus/namespaces"
  target_resource_location = var.environment.location

  scopes = [
    var.service_bus_namespace_id
  ]

  frequency     = var.alerts_on_active_messages.check_every
  window_size   = var.alerts_on_active_messages.lookback_period
  auto_mitigate = var.alerts_on_active_messages.auto_mitigate

  criteria {
    metric_namespace       = "Microsoft.ServiceBus/namespaces"
    metric_name            = "ActiveMessages"
    aggregation            = "Average"
    operator               = "GreaterThan"
    skip_metric_validation = false
    threshold              = var.alerts_on_active_messages.threshold

    dimension {
      name     = "EntityName"
      operator = "Include"
      values   = var.alerts_on_active_messages.entity_names
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
