resource "azurerm_monitor_autoscale_setting" "this" {
  name                = "${module.naming_convention.resource_name_prefix}-as-${var.environment.instance_number}"
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  target_resource_id  = var.app_service_plan_id

  # start high load
  profile {
    name = var.scheduler.high_load.name

    capacity {
      default = var.scheduler.high_load.default
      minimum = var.scheduler.high_load.minimum
      maximum = var.scheduler.high_load.maximum
    }

    recurrence {
      timezone = "W. Europe Standard Time"
      hours    = [var.scheduler.high_load.start.hour]
      minutes  = [var.scheduler.high_load.start.minutes]
      days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
    }

    # Requests - increase
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_increase.metric_trigger.time_grain
        statistic                = local.requests_rule_increase.metric_trigger.statistic
        time_window              = local.requests_rule_increase.metric_trigger.time_window
        time_aggregation         = local.requests_rule_increase.metric_trigger.time_aggregation
        operator                 = local.requests_rule_increase.metric_trigger.operator
        threshold                = local.requests_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_increase.scale_action.cooldown
        direction = local.requests_rule_increase.scale_action.direction
        type      = local.requests_rule_increase.scale_action.type
        value     = local.requests_rule_increase.scale_action.value
      }
    }

    # Requests - decrease
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_decrease.metric_trigger.time_grain
        statistic                = local.requests_rule_decrease.metric_trigger.statistic
        time_window              = local.requests_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.requests_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.requests_rule_decrease.metric_trigger.operator
        threshold                = local.requests_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_decrease.scale_action.cooldown
        direction = local.requests_rule_decrease.scale_action.direction
        type      = local.requests_rule_decrease.scale_action.type
        value     = local.requests_rule_decrease.scale_action.value
      }
    }

    # CPU - increase
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_increase.metric_trigger.time_grain
        statistic                = local.cpu_rule_increase.metric_trigger.statistic
        time_window              = local.cpu_rule_increase.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_increase.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_increase.metric_trigger.operator
        threshold                = local.cpu_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_increase.scale_action.cooldown
        direction = local.cpu_rule_increase.scale_action.direction
        type      = local.cpu_rule_increase.scale_action.type
        value     = local.cpu_rule_increase.scale_action.value
      }
    }

    # CPU - decrease
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_decrease.metric_trigger.time_grain
        statistic                = local.cpu_rule_decrease.metric_trigger.statistic
        time_window              = local.cpu_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_decrease.metric_trigger.operator
        threshold                = local.cpu_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_decrease.scale_action.cooldown
        direction = local.cpu_rule_decrease.scale_action.direction
        type      = local.cpu_rule_decrease.scale_action.type
        value     = local.cpu_rule_decrease.scale_action.value
      }
    }

    # Memory - increase
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_increase.metric_trigger.time_grain
        statistic                = local.memory_rule_increase.metric_trigger.statistic
        time_window              = local.memory_rule_increase.metric_trigger.time_window
        time_aggregation         = local.memory_rule_increase.metric_trigger.time_aggregation
        operator                 = local.memory_rule_increase.metric_trigger.operator
        threshold                = local.memory_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_increase.scale_action.cooldown
        direction = local.memory_rule_increase.scale_action.direction
        type      = local.memory_rule_increase.scale_action.type
        value     = local.memory_rule_increase.scale_action.value
      }
    }

    # Memory - decrease
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_decrease.metric_trigger.time_grain
        statistic                = local.memory_rule_decrease.metric_trigger.statistic
        time_window              = local.memory_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.memory_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.memory_rule_decrease.metric_trigger.operator
        threshold                = local.memory_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_decrease.scale_action.cooldown
        direction = local.memory_rule_decrease.scale_action.direction
        type      = local.memory_rule_decrease.scale_action.type
        value     = local.memory_rule_decrease.scale_action.value
      }
    }
  }

  # end high load
  profile {
    name = "{\"name\":\"default\",\"for\":\"${var.scheduler.high_load.name}\"}"

    capacity {
      default = var.scheduler.normal_load.default
      minimum = var.scheduler.normal_load.minimum
      maximum = var.scheduler.normal_load.maximum
    }

    recurrence {
      timezone = "W. Europe Standard Time"
      hours    = [var.scheduler.high_load.end.hour]
      minutes  = [var.scheduler.high_load.end.minutes]
      days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
    }

    # Requests - increase
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_increase.metric_trigger.time_grain
        statistic                = local.requests_rule_increase.metric_trigger.statistic
        time_window              = local.requests_rule_increase.metric_trigger.time_window
        time_aggregation         = local.requests_rule_increase.metric_trigger.time_aggregation
        operator                 = local.requests_rule_increase.metric_trigger.operator
        threshold                = local.requests_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_increase.scale_action.cooldown
        direction = local.requests_rule_increase.scale_action.direction
        type      = local.requests_rule_increase.scale_action.type
        value     = local.requests_rule_increase.scale_action.value
      }
    }

    # Requests - decrease
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_decrease.metric_trigger.time_grain
        statistic                = local.requests_rule_decrease.metric_trigger.statistic
        time_window              = local.requests_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.requests_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.requests_rule_decrease.metric_trigger.operator
        threshold                = local.requests_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_decrease.scale_action.cooldown
        direction = local.requests_rule_decrease.scale_action.direction
        type      = local.requests_rule_decrease.scale_action.type
        value     = local.requests_rule_decrease.scale_action.value
      }
    }

    # CPU - increase
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_increase.metric_trigger.time_grain
        statistic                = local.cpu_rule_increase.metric_trigger.statistic
        time_window              = local.cpu_rule_increase.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_increase.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_increase.metric_trigger.operator
        threshold                = local.cpu_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_increase.scale_action.cooldown
        direction = local.cpu_rule_increase.scale_action.direction
        type      = local.cpu_rule_increase.scale_action.type
        value     = local.cpu_rule_increase.scale_action.value
      }
    }

    # CPU - decrease
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_decrease.metric_trigger.time_grain
        statistic                = local.cpu_rule_decrease.metric_trigger.statistic
        time_window              = local.cpu_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_decrease.metric_trigger.operator
        threshold                = local.cpu_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_decrease.scale_action.cooldown
        direction = local.cpu_rule_decrease.scale_action.direction
        type      = local.cpu_rule_decrease.scale_action.type
        value     = local.cpu_rule_decrease.scale_action.value
      }
    }

    # Memory - increase
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_increase.metric_trigger.time_grain
        statistic                = local.memory_rule_increase.metric_trigger.statistic
        time_window              = local.memory_rule_increase.metric_trigger.time_window
        time_aggregation         = local.memory_rule_increase.metric_trigger.time_aggregation
        operator                 = local.memory_rule_increase.metric_trigger.operator
        threshold                = local.memory_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_increase.scale_action.cooldown
        direction = local.memory_rule_increase.scale_action.direction
        type      = local.memory_rule_increase.scale_action.type
        value     = local.memory_rule_increase.scale_action.value
      }
    }

    # Memory - decrease
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_decrease.metric_trigger.time_grain
        statistic                = local.memory_rule_decrease.metric_trigger.statistic
        time_window              = local.memory_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.memory_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.memory_rule_decrease.metric_trigger.operator
        threshold                = local.memory_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_decrease.scale_action.cooldown
        direction = local.memory_rule_decrease.scale_action.direction
        type      = local.memory_rule_decrease.scale_action.type
        value     = local.memory_rule_decrease.scale_action.value
      }
    }
  }

  # start low load
  profile {
    name = var.scheduler.low_load.name

    capacity {
      default = var.scheduler.low_load.default
      minimum = var.scheduler.low_load.minimum
      maximum = var.scheduler.low_load.maximum
    }

    recurrence {
      timezone = "W. Europe Standard Time"
      hours    = [var.scheduler.low_load.start.hour]
      minutes  = [var.scheduler.low_load.start.minutes]
      days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
    }

    # Requests - increase
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_increase.metric_trigger.time_grain
        statistic                = local.requests_rule_increase.metric_trigger.statistic
        time_window              = local.requests_rule_increase.metric_trigger.time_window
        time_aggregation         = local.requests_rule_increase.metric_trigger.time_aggregation
        operator                 = local.requests_rule_increase.metric_trigger.operator
        threshold                = local.requests_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_increase.scale_action.cooldown
        direction = local.requests_rule_increase.scale_action.direction
        type      = local.requests_rule_increase.scale_action.type
        value     = local.requests_rule_increase.scale_action.value
      }
    }

    # Requests - decrease
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_decrease.metric_trigger.time_grain
        statistic                = local.requests_rule_decrease.metric_trigger.statistic
        time_window              = local.requests_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.requests_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.requests_rule_decrease.metric_trigger.operator
        threshold                = local.requests_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_decrease.scale_action.cooldown
        direction = local.requests_rule_decrease.scale_action.direction
        type      = local.requests_rule_decrease.scale_action.type
        value     = local.requests_rule_decrease.scale_action.value
      }
    }

    # CPU - increase
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_increase.metric_trigger.time_grain
        statistic                = local.cpu_rule_increase.metric_trigger.statistic
        time_window              = local.cpu_rule_increase.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_increase.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_increase.metric_trigger.operator
        threshold                = local.cpu_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_increase.scale_action.cooldown
        direction = local.cpu_rule_increase.scale_action.direction
        type      = local.cpu_rule_increase.scale_action.type
        value     = local.cpu_rule_increase.scale_action.value
      }
    }

    # CPU - decrease
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_decrease.metric_trigger.time_grain
        statistic                = local.cpu_rule_decrease.metric_trigger.statistic
        time_window              = local.cpu_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_decrease.metric_trigger.operator
        threshold                = local.cpu_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_decrease.scale_action.cooldown
        direction = local.cpu_rule_decrease.scale_action.direction
        type      = local.cpu_rule_decrease.scale_action.type
        value     = local.cpu_rule_decrease.scale_action.value
      }
    }

    # Memory - increase
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_increase.metric_trigger.time_grain
        statistic                = local.memory_rule_increase.metric_trigger.statistic
        time_window              = local.memory_rule_increase.metric_trigger.time_window
        time_aggregation         = local.memory_rule_increase.metric_trigger.time_aggregation
        operator                 = local.memory_rule_increase.metric_trigger.operator
        threshold                = local.memory_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_increase.scale_action.cooldown
        direction = local.memory_rule_increase.scale_action.direction
        type      = local.memory_rule_increase.scale_action.type
        value     = local.memory_rule_increase.scale_action.value
      }
    }

    # Memory - decrease
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_decrease.metric_trigger.time_grain
        statistic                = local.memory_rule_decrease.metric_trigger.statistic
        time_window              = local.memory_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.memory_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.memory_rule_decrease.metric_trigger.operator
        threshold                = local.memory_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_decrease.scale_action.cooldown
        direction = local.memory_rule_decrease.scale_action.direction
        type      = local.memory_rule_decrease.scale_action.type
        value     = local.memory_rule_decrease.scale_action.value
      }
    }
  }

  # end low load
  profile {
    name = "{\"name\":\"default\",\"for\":\"${var.scheduler.low_load.name}\"}"

    capacity {
      default = var.scheduler.normal_load.default
      minimum = var.scheduler.normal_load.minimum
      maximum = var.scheduler.normal_load.maximum
    }

    recurrence {
      timezone = "W. Europe Standard Time"
      hours    = [var.scheduler.low_load.end.hour]
      minutes  = [var.scheduler.low_load.end.minutes]
      days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
    }

    # Requests - increase
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_increase.metric_trigger.time_grain
        statistic                = local.requests_rule_increase.metric_trigger.statistic
        time_window              = local.requests_rule_increase.metric_trigger.time_window
        time_aggregation         = local.requests_rule_increase.metric_trigger.time_aggregation
        operator                 = local.requests_rule_increase.metric_trigger.operator
        threshold                = local.requests_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_increase.scale_action.cooldown
        direction = local.requests_rule_increase.scale_action.direction
        type      = local.requests_rule_increase.scale_action.type
        value     = local.requests_rule_increase.scale_action.value
      }
    }

    # Requests - decrease
    rule {
      metric_trigger {
        metric_name              = local.requests_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.requests_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.requests_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.requests_rule_decrease.metric_trigger.time_grain
        statistic                = local.requests_rule_decrease.metric_trigger.statistic
        time_window              = local.requests_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.requests_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.requests_rule_decrease.metric_trigger.operator
        threshold                = local.requests_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.requests_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.requests_rule_decrease.scale_action.cooldown
        direction = local.requests_rule_decrease.scale_action.direction
        type      = local.requests_rule_decrease.scale_action.type
        value     = local.requests_rule_decrease.scale_action.value
      }
    }

    # CPU - increase
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_increase.metric_trigger.time_grain
        statistic                = local.cpu_rule_increase.metric_trigger.statistic
        time_window              = local.cpu_rule_increase.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_increase.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_increase.metric_trigger.operator
        threshold                = local.cpu_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_increase.scale_action.cooldown
        direction = local.cpu_rule_increase.scale_action.direction
        type      = local.cpu_rule_increase.scale_action.type
        value     = local.cpu_rule_increase.scale_action.value
      }
    }

    # CPU - decrease
    rule {
      metric_trigger {
        metric_name              = local.cpu_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.cpu_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.cpu_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.cpu_rule_decrease.metric_trigger.time_grain
        statistic                = local.cpu_rule_decrease.metric_trigger.statistic
        time_window              = local.cpu_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.cpu_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.cpu_rule_decrease.metric_trigger.operator
        threshold                = local.cpu_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.cpu_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.cpu_rule_decrease.scale_action.cooldown
        direction = local.cpu_rule_decrease.scale_action.direction
        type      = local.cpu_rule_decrease.scale_action.type
        value     = local.cpu_rule_decrease.scale_action.value
      }
    }

    # Memory - increase
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_increase.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_increase.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_increase.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_increase.metric_trigger.time_grain
        statistic                = local.memory_rule_increase.metric_trigger.statistic
        time_window              = local.memory_rule_increase.metric_trigger.time_window
        time_aggregation         = local.memory_rule_increase.metric_trigger.time_aggregation
        operator                 = local.memory_rule_increase.metric_trigger.operator
        threshold                = local.memory_rule_increase.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_increase.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_increase.scale_action.cooldown
        direction = local.memory_rule_increase.scale_action.direction
        type      = local.memory_rule_increase.scale_action.type
        value     = local.memory_rule_increase.scale_action.value
      }
    }

    # Memory - decrease
    rule {
      metric_trigger {
        metric_name              = local.memory_rule_decrease.metric_trigger.metric_name
        metric_resource_id       = local.memory_rule_decrease.metric_trigger.metric_resource_id
        metric_namespace         = local.memory_rule_decrease.metric_trigger.metric_namespace
        time_grain               = local.memory_rule_decrease.metric_trigger.time_grain
        statistic                = local.memory_rule_decrease.metric_trigger.statistic
        time_window              = local.memory_rule_decrease.metric_trigger.time_window
        time_aggregation         = local.memory_rule_decrease.metric_trigger.time_aggregation
        operator                 = local.memory_rule_decrease.metric_trigger.operator
        threshold                = local.memory_rule_decrease.metric_trigger.threshold
        divide_by_instance_count = local.memory_rule_decrease.metric_trigger.divide_by_instance_count
      }

      scale_action {
        cooldown  = local.memory_rule_decrease.scale_action.cooldown
        direction = local.memory_rule_decrease.scale_action.direction
        type      = local.memory_rule_decrease.scale_action.type
        value     = local.memory_rule_decrease.scale_action.value
      }
    }
  }

  tags = var.tags
}
