resource "azurerm_api_management_logger" "this" {
  count = var.application_insights.enabled ? 1 : 0

  name                = "${local.apim.name}-logger"
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name
  resource_id         = var.application_insights.id

  dynamic "application_insights" {
    for_each = var.management_logger_application_insight_enabled ? [1] : []
    content {
      connection_string = var.application_insights.connection_string
    }
  }
}

resource "azurerm_api_management_diagnostic" "applicationinsights" {
  count = var.application_insights.enabled ? 1 : 0

  identifier               = "applicationinsights"
  api_management_name      = azurerm_api_management.this.name
  resource_group_name      = azurerm_api_management.this.resource_group_name
  api_management_logger_id = azurerm_api_management_logger.this[0].id

  always_log_errors         = true
  http_correlation_protocol = "W3C"

  verbosity           = var.application_insights.verbosity
  sampling_percentage = var.application_insights.sampling_percentage
}

// Collect diagnostic logs and metrics to a Log Analytics workspace
resource "azurerm_monitor_diagnostic_setting" "apim" {
  count = var.monitoring.enabled ? 1 : 0

  name               = "${local.apim.name}-diagnostic"
  target_resource_id = azurerm_api_management.this.id

  log_analytics_workspace_id     = var.monitoring.log_analytics_workspace_id
  log_analytics_destination_type = "AzureDiagnostics"

  # Add logs only if enabled
  dynamic "enabled_log" {
    for_each = var.monitoring.logs.enabled ? (
      length(var.monitoring.logs.groups) > 0 ? var.monitoring.logs.groups : var.monitoring.logs.categories
    ) : []

    content {
      category_group = length(var.monitoring.logs.groups) > 0 ? enabled_log.value : null
      category       = length(var.monitoring.logs.categories) > 0 ? enabled_log.value : null
    }
  }

  # Add metrics if enabled (using enabled_metric to replace deprecated metric block)
  dynamic "enabled_metric" {
    for_each = var.monitoring.metrics.enabled ? ["AllMetrics"] : []

    content {
      category = enabled_metric.value
    }
  }
}

resource "azurerm_monitor_metric_alert" "this" {
  for_each = local.use_case_features.alerts ? var.metric_alerts : {}

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
