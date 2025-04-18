locals {
  app_service_details = flatten([
    [
      for app_service in var.target_services.app_service != null ? var.target_services.app_service : [] :
      {
        is_app_service    = true
        is_function_app   = false
        base_name         = try(app_service.name, reverse(split("/", app_service.id))[0])
        target_service_id = try(app_service.id, data.azurerm_linux_web_app.this[app_service.name].id)
      }
      if (length(keys(app_service)) == 1 && (contains(keys(app_service), "name") || contains(keys(app_service), "id")))
    ],
    [
      for function_app in var.target_services.function_app != null ? var.target_services.function_app : [] :
      {
        is_app_service    = false
        is_function_app   = true
        base_name         = try(function_app.name, reverse(split("/", function_app.id))[0])
        target_service_id = try(function_app.id, data.azurerm_linux_function_app.this[function_app.name].id)
      }
      if (length(keys(function_app)) == 1 && (contains(keys(function_app), "name") || contains(keys(function_app), "id")))
    ]
  ])
  
  # Generates an autoscaler name by replacing "fn", "func", or "app" with "as".
  # Example:
  #   Input:  "dx-d-itn-test-fn-01"
  #   Output: "dx-d-itn-test-as-01"
  autoscale_name = var.autoscale_name == null ? (
    length(local.app_service_details) > 0 ? 
    replace(replace(replace(local.app_service_details[0].base_name, "fn", "as"), "func", "as"), "app", "as") : 
    "autoscaler"
  ) : var.autoscale_name

  requests_rules_increase = flatten([
    for details in local.app_service_details :
    {
      metric_trigger = {
        metric_name              = "Requests"
        metric_resource_id       = details.target_service_id
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
        metric_resource_id       = details.target_service_id
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
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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