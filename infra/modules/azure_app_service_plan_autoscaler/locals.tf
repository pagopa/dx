locals {

  app_service_details = [
    for service in var.target_services :
    {
      is_app_service  = service.app_service_name != null
      is_function_app = service.function_app_name != null
      base_name       = service.app_service_name != null ? service.app_service_name : service.function_app_name
      app_service_id  = service.app_service_name != null ? data.azurerm_linux_web_app.this[0].id : data.azurerm_linux_function_app.this[0].id
    }
  ]

  autoscale_name = var.autoscale_name == null ? replace(replace(replace(local.base_name, "fn", "as"), "func", "as"), "app", "as") : var.autoscale_name

  // Take the resouce group and the location from the first declared AppService or FunctionApp
  resource_group_name  = local.app_service_details[0].is_app_service ? data.azurerm_linux_web_app.this[0].resource_group_name : data.azurerm_linux_function_app.this[0].resource_group_name
  location             = local.app_service_details[0].is_app_service ? data.azurerm_linux_web_app.this[0].location : data.azurerm_linux_function_app.this[0].location
  app_service_plan_ids = [for service in var.target_services : service.app_service_name != null ? data.azurerm_linux_web_app.this[0].service_plan_id : data.azurerm_linux_function_app.this[0].service_plan_id]

  requests_rules_increase = flatten([
    for details in local.app_service_details :
    {
      metric_trigger = {
        metric_name              = "Requests"
        metric_resource_id       = details.app_service_id
        metric_namespace         = "microsoft.web/sites"
        time_grain               = "PT1M"
        statistic                = try(var.scale_metrics.requests.statistic_increase, "Average")
        time_window              = try("PT${var.scale_metrics.requests.time_window_increase}M", "PT1M")
        time_aggregation         = try(var.scale_metrics.requests.time_aggregation_increase, "Average")
        operator                 = "GreaterThan"
        threshold                = try(var.scale_metrics.requests.upper_threshold, null)
        divide_by_instance_count = true
      }

      scale_action = {
        direction = "Increase"
        type      = "ChangeCount"
        value     = try(var.scale_metrics.requests.increase_by, null)
        cooldown  = try("PT${var.scale_metrics.requests.cooldown_increase}M", "PT1M")
      }
    }
  ])

  requests_rules_decrease = flatten([
    for details in local.app_service_details :
    {
      metric_trigger = {
        metric_name              = "Requests"
        metric_resource_id       = details.app_service_id
        metric_namespace         = "microsoft.web/sites"
        time_grain               = "PT1M"
        statistic                = try(var.scale_metrics.requests.statistic_decrease, "Average")
        time_window              = try("PT${var.scale_metrics.requests.time_window_decrease}M", "PT1M")
        time_aggregation         = try(var.scale_metrics.requests.time_aggregation_decrease, "Average")
        operator                 = "LessThan"
        threshold                = try(var.scale_metrics.requests.lower_threshold, null)
        divide_by_instance_count = true
      }

      scale_action = {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = try(var.scale_metrics.requests.decrease_by, null)
        cooldown  = try("PT${var.scale_metrics.requests.cooldown_decrease}M", "PT10M")
      }
    }
  ])

  cpu_rule_increase = {
    metric_trigger = {
      metric_name              = "CpuPercentage"
      metric_resource_id       = local.app_service_plan_ids[0]
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = var.scale_metrics.cpu.statistic_increase
      time_window              = "PT${var.scale_metrics.cpu.time_window_increase}M"
      time_aggregation         = var.scale_metrics.cpu.time_aggregation_increase
      operator                 = "GreaterThan"
      threshold                = var.scale_metrics.cpu.upper_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = var.scale_metrics.cpu.increase_by
      cooldown  = "PT${var.scale_metrics.cpu.cooldown_increase}M"
    }
  }

  cpu_rule_decrease = {
    metric_trigger = {
      metric_name              = "CpuPercentage"
      metric_resource_id       = local.app_service_plan_ids[0]
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = var.scale_metrics.cpu.statistic_decrease
      time_window              = "PT${var.scale_metrics.cpu.time_window_decrease}M"
      time_aggregation         = var.scale_metrics.cpu.time_aggregation_decrease
      operator                 = "LessThan"
      threshold                = var.scale_metrics.cpu.lower_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = var.scale_metrics.cpu.decrease_by
      cooldown  = "PT${var.scale_metrics.cpu.cooldown_decrease}M"
    }
  }

  memory_rule_increase = {
    metric_trigger = {
      metric_name              = "MemoryPercentage"
      metric_resource_id       = local.app_service_plan_ids[0]
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = try(var.scale_metrics.memory.statistic_increase, "Average")
      time_window              = try("PT${var.scale_metrics.memory.time_window_increase}M", "PT1M")
      time_aggregation         = try(var.scale_metrics.memory.time_aggregation_increase, "Average")
      operator                 = "GreaterThan"
      threshold                = try(var.scale_metrics.memory.upper_threshold, null)
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = try(var.scale_metrics.memory.increase_by, null)
      cooldown  = try("PT${var.scale_metrics.memory.cooldown_increase}M", "PT1M")
    }
  }

  memory_rule_decrease = {
    metric_trigger = {
      metric_name              = "MemoryPercentage"
      metric_resource_id       = local.app_service_plan_ids[0]
      metric_namespace         = "microsoft.web/serverfarms"
      time_grain               = "PT1M"
      statistic                = try(var.scale_metrics.memory.statistic_decrease, "Average")
      time_window              = try("PT${var.scale_metrics.memory.time_window_decrease}M", "PT1M")
      time_aggregation         = try(var.scale_metrics.memory.time_aggregation_decrease, "Average")
      operator                 = "LessThan"
      threshold                = try(var.scale_metrics.memory.lower_threshold, null)
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = try(var.scale_metrics.memory.decrease_by, null)
      cooldown  = try("PT${var.scale_metrics.memory.cooldown_decrease}M", "PT1M")
    }
  }
}
