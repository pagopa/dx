locals {

  is_app_service  = var.target_service.app_service_name != null
  is_function_app = var.target_service.function_app_name != null

  base_name = local.is_app_service ? data.azurerm_linux_web_app.this[0].name : data.azurerm_linux_function_app.this[0].name

  autoscale_name      = replace(replace(replace(local.base_name, "fn", "as"), "func", "as"), "app", "as")
  resource_group_name = local.is_app_service ? data.azurerm_linux_web_app.this[0].resource_group_name : data.azurerm_linux_function_app.this[0].resource_group_name
  location            = local.is_app_service ? data.azurerm_linux_web_app.this[0].location : data.azurerm_linux_function_app.this[0].location
  app_service_id      = local.is_app_service ? data.azurerm_linux_web_app.this[0].id : data.azurerm_linux_function_app.this[0].id
  app_service_plan_id = local.is_app_service ? data.azurerm_linux_web_app.this[0].service_plan_id : data.azurerm_linux_function_app.this[0].service_plan_id

  requests_rule_increase = {
    metric_trigger = {
      metric_name              = "Requests"
      metric_resource_id       = local.app_service_id
      metric_namespace         = "microsoft.web/sites"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT1M"
      time_aggregation         = "Average"
      operator                 = "GreaterThan"
      threshold                = try(var.scale_metrics.requests.upper_threshold, null)
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = try(var.scale_metrics.requests.increase_by, null)
      cooldown  = "PT1M"
    }
  }

  requests_rule_decrease = {
    metric_trigger = {
      metric_name              = "Requests"
      metric_resource_id       = local.app_service_id
      metric_namespace         = "microsoft.web/sites"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT1M"
      time_aggregation         = "Average"
      operator                 = "LessThan"
      threshold                = try(var.scale_metrics.requests.lower_threshold, null)
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = try(var.scale_metrics.requests.decrease_by, null)
      cooldown  = "PT10M"
    }
  }

  cpu_rule_increase = {
    metric_trigger = {
      metric_name              = "CpuPercentage"
      metric_resource_id       = local.app_service_plan_id
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT5M"
      time_aggregation         = "Average"
      operator                 = "GreaterThan"
      threshold                = var.scale_metrics.cpu.upper_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = var.scale_metrics.cpu.increase_by
      cooldown  = "PT1M"
    }
  }

  cpu_rule_decrease = {
    metric_trigger = {
      metric_name              = "CpuPercentage"
      metric_resource_id       = local.app_service_plan_id
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT5M"
      time_aggregation         = "Average"
      operator                 = "LessThan"
      threshold                = var.scale_metrics.cpu.lower_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = var.scale_metrics.cpu.decrease_by
      cooldown  = "PT20M"
    }
  }

  memory_rule_increase = {
    metric_trigger = {
      metric_name              = "MemoryPercentage"
      metric_resource_id       = local.app_service_plan_id
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT5M"
      time_aggregation         = "Average"
      operator                 = "GreaterThan"
      threshold                = var.scale_metrics.memory.upper_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = var.scale_metrics.memory.increase_by
      cooldown  = "PT1M"
    }
  }

  memory_rule_decrease = {
    metric_trigger = {
      metric_name              = "MemoryPercentage"
      metric_resource_id       = local.app_service_plan_id
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT5M"
      time_aggregation         = "Average"
      operator                 = "LessThan"
      threshold                = var.scale_metrics.memory.lower_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = var.scale_metrics.memory.decrease_by
      cooldown  = "PT5M"
    }
  }
}
