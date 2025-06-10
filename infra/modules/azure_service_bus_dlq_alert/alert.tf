resource "azurerm_monitor_metric_alert" "this" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "monitor_alert_sbns_dlq" })) # requires a provider update. Expected value: dx-d-itn-domain-sbns-dlq-ma-01
  resource_group_name = local.resource_group_name
  enabled             = var.enable
  scopes              = [var.service_bus_namespace_id]
  description         = var.description
  severity            = local.severity

  target_resource_type     = "Microsoft.ServiceBus/namespaces"
  target_resource_location = var.environment.location

  frequency     = var.frequency
  window_size   = var.window_size
  auto_mitigate = var.auto_mitigate


  criteria {
    metric_namespace       = "Microsoft.ServiceBus/namespaces"
    metric_name            = "DeadletteredMessages"
    aggregation            = "Average"
    operator               = "GreaterThan"
    skip_metric_validation = false
    threshold              = var.threshold

    dynamic "dimension" {
      for_each = var.entity_names

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
