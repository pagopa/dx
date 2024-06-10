locals {
  requests_rule_increase = {
    metric_trigger = {
      metric_name              = "Requests"
      metric_resource_id       = var.app_service_id
      metric_namespace         = "microsoft.web/sites"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT1M"
      time_aggregation         = "Average"
      operator                 = "GreaterThan"
      threshold                = var.scale_metrics.requests.upper_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Increase"
      type      = "ChangeCount"
      value     = var.scale_metrics.requests.increase_by
      cooldown  = "PT1M"
    }
  }

  requests_rule_decrease = {
    metric_trigger = {
      metric_name              = "Requests"
      metric_resource_id       = var.app_service_id
      metric_namespace         = "microsoft.web/sites"
      time_grain               = "PT1M"
      statistic                = "Average"
      time_window              = "PT1M"
      time_aggregation         = "Average"
      operator                 = "LessThan"
      threshold                = var.scale_metrics.requests.lower_threshold
      divide_by_instance_count = false
    }

    scale_action = {
      direction = "Decrease"
      type      = "ChangeCount"
      value     = var.scale_metrics.requests.decrease_by
      cooldown  = "PT10M"
    }
  }

  cpu_rule_increase = {
    metric_trigger = {
      metric_name              = "CpuPercentage"
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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
      metric_resource_id       = var.app_service_plan_id
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
