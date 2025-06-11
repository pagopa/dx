resource "azurerm_monitor_metric_alert" "active" {
  count = var.alerts_on_active_messages == null ? 0 : 1

  name                     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "monitor_alert_sbns_active" })) # requires a provider update. Expected value: dx-d-itn-domain-sbns-dlq-ma-01
  resource_group_name      = local.resource_group_name
  enabled                  = var.alerts_on_active_messages != null
  description              = var.alerts_on_active_messages.description
  severity                 = local.active_severity
  target_resource_type     = "Microsoft.ServiceBus/namespaces"
  target_resource_location = var.environment.location

  scopes = [
    var.service_bus_namespace_id
  ]

  frequency     = var.alerts_on_active_messages.frequency
  window_size   = var.alerts_on_active_messages.window_size
  auto_mitigate = var.alerts_on_active_messages.auto_mitigate

  criteria {
    metric_namespace       = "Microsoft.ServiceBus/namespaces"
    metric_name            = "DeadletteredMessages"
    aggregation            = "Average"
    operator               = "GreaterThan"
    skip_metric_validation = false
    threshold              = var.alerts_on_active_messages.threshold

    dynamic "dimension" {
      for_each = var.alerts_on_active_messages.entity_names

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
