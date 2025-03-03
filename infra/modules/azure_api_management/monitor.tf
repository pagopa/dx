resource "azurerm_api_management_logger" "this" {
  count = var.application_insights.enabled ? 1 : 0

  name                = "${local.apim.name}-logger"
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name

  dynamic "application_insights" {
    for_each = var.management_logger_application_insight_enabled ? [1] : []
    content {
      connection_string = var.application_insights.connection_string
    }
  }
}

resource "azurerm_monitor_metric_alert" "this" {
  for_each = var.tier != "s" ? var.metric_alerts : {}

  name                = "${azurerm_api_management.this.name}-${upper(each.key)}"
  description         = each.value.description
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_api_management.this.id]
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  severity            = each.value.severity
  auto_mitigate       = each.value.auto_mitigate
  enabled             = true

  dynamic "action" {
    for_each = var.action_group_id != null ? ["dummy"] : []
    content {
      action_group_id = var.action_group_id
    }
  }

  dynamic "criteria" {
    for_each = each.value.criteria
    content {
      aggregation            = criteria.value["aggregation"]
      metric_name            = criteria.value["metric_name"]
      metric_namespace       = criteria.value["metric_namespace"]
      operator               = criteria.value["operator"]
      skip_metric_validation = criteria.value["skip_metric_validation"]
      threshold              = criteria.value["threshold"]

      dynamic "dimension" {
        for_each = criteria.value.dimension
        content {
          name     = dimension.value["name"]
          operator = dimension.value["operator"]
          values   = dimension.value["values"]
        }
      }

    }
  }

  dynamic "dynamic_criteria" {
    for_each = each.value.dynamic_criteria
    content {
      aggregation              = dynamic_criteria.value["aggregation"]
      alert_sensitivity        = dynamic_criteria.value["alert_sensitivity"]
      evaluation_failure_count = dynamic_criteria.value["evaluation_failure_count"]
      evaluation_total_count   = dynamic_criteria.value["evaluation_total_count"]
      ignore_data_before       = dynamic_criteria.value["ignore_data_before"]
      metric_name              = dynamic_criteria.value["metric_name"]
      metric_namespace         = dynamic_criteria.value["metric_namespace"]
      operator                 = dynamic_criteria.value["operator"]
      skip_metric_validation   = dynamic_criteria.value["skip_metric_validation"]

      dynamic "dimension" {
        for_each = dynamic_criteria.value.dimension
        content {
          name     = dimension.value["name"]
          operator = dimension.value["operator"]
          values   = dimension.value["values"]
        }
      }

    }
  }
}
