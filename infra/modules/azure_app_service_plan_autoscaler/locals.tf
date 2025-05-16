locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })

  # Extract all configured services
  target_services = {
    app_services = [
      for app_service in var.target_service.app_services : {
        id   = coalesce(app_service.id, try(data.azurerm_linux_web_app.app_services[app_service.name].id, null))
        name = coalesce(app_service.name, try(reverse(split("/", app_service.id))[0], null))
        type = "app_service"
      }
    ]
    function_apps = [
      for function_app in var.target_service.function_apps : {
        id   = coalesce(function_app.id, try(data.azurerm_linux_function_app.function_apps[function_app.name].id, null))
        name = coalesce(function_app.name, try(reverse(split("/", function_app.id))[0], null))
        type = "function_app"
      }
    ]
  }

  # Merge all services into a single array
  all_services = concat(local.target_services.app_services, local.target_services.function_apps)

  # Determine the autoscaler name
  primary_service_name = length(local.all_services) > 0 ? local.all_services[0].name : "unknown"
  base_name            = local.primary_service_name

  # Generate a name for the autoscaler by replacing "fn", "func", or "app" with "as"
  # Example:
  #   Input:  "dx-d-itn-test-fn-01"
  #   Output: "dx-d-itn-test-as-01"
  autoscale_name = var.autoscale_name == null ? replace(replace(replace(local.base_name, "fn", "as"), "func", "as"), "app", "as") : var.autoscale_name

  # Definition of request rules for each service
  requests_rules_increase = flatten([
    for service in local.all_services : {
      metric_trigger = {
        metric_name              = "Requests"
        metric_resource_id       = service.id
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
    for service in local.all_services : {
      metric_trigger = {
        metric_name              = "Requests"
        metric_resource_id       = service.id
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

  # CPU rules - these are at the service plan level, so they don't change
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

  # Memory rules - these are at the service plan level, so they don't change
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
