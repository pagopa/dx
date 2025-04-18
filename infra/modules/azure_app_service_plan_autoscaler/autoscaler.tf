resource "azurerm_monitor_autoscale_setting" "this" {
  name                = local.autoscale_name
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = var.app_service_plan_id

  # start high load
  dynamic "profile" {
    for_each = var.scheduler.high_load == null ? [] : [1]

    content {
      name = var.scheduler.high_load.name

      capacity {
        default = var.scheduler.high_load.default
        minimum = var.scheduler.high_load.minimum
        maximum = var.scheduler.maximum
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
      dynamic "rule" {
        for_each = flatten([
          for rule in local.requests_rules_increase :
          var.scale_metrics.requests != null ? [rule] : []
        ])

        content {
          metric_trigger {
            metric_name              = rule.metric_trigger.metric_name
            metric_resource_id       = rule.metric_trigger.metric_resource_id
            metric_namespace         = rule.metric_trigger.metric_namespace
            time_grain               = rule.metric_trigger.time_grain
            statistic                = rule.metric_trigger.statistic
            time_window              = rule.metric_trigger.time_window
            time_aggregation         = rule.metric_trigger.time_aggregation
            operator                 = rule.metric_trigger.operator
            threshold                = rule.metric_trigger.threshold
            divide_by_instance_count = rule.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = rule.scale_action.cooldown
            direction = rule.scale_action.direction
            type      = rule.scale_action.type
            value     = rule.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = flatten([
          for rule in local.requests_rules_decrease :
          var.scale_metrics.requests != null ? [rule] : []
        ])

        content {
          metric_trigger {
            metric_name              = rule.metric_trigger.metric_name
            metric_resource_id       = rule.metric_trigger.metric_resource_id
            metric_namespace         = rule.metric_trigger.metric_namespace
            time_grain               = rule.metric_trigger.time_grain
            statistic                = rule.metric_trigger.statistic
            time_window              = rule.metric_trigger.time_window
            time_aggregation         = rule.metric_trigger.time_aggregation
            operator                 = rule.metric_trigger.operator
            threshold                = rule.metric_trigger.threshold
            divide_by_instance_count = rule.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = rule.scale_action.cooldown
            direction = rule.scale_action.direction
            type      = rule.scale_action.type
            value     = rule.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  # end high load
  dynamic "profile" {
    for_each = var.scheduler.high_load == null ? [] : [1]

    content {
      name = "{\"name\":\"default\",\"for\":\"${var.scheduler.high_load.name}\"}"

      capacity {
        default = var.scheduler.normal_load.default
        minimum = var.scheduler.normal_load.minimum
        maximum = var.scheduler.maximum
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
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_increase.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_increase.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_increase.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_increase.metric_trigger.time_grain
            statistic                = local.requests_rules_increase.metric_trigger.statistic
            time_window              = local.requests_rules_increase.metric_trigger.time_window
            time_aggregation         = local.requests_rules_increase.metric_trigger.time_aggregation
            operator                 = local.requests_rules_increase.metric_trigger.operator
            threshold                = local.requests_rules_increase.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_increase.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_increase.scale_action.cooldown
            direction = local.requests_rules_increase.scale_action.direction
            type      = local.requests_rules_increase.scale_action.type
            value     = local.requests_rules_increase.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_decrease.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_decrease.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_decrease.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_decrease.metric_trigger.time_grain
            statistic                = local.requests_rules_decrease.metric_trigger.statistic
            time_window              = local.requests_rules_decrease.metric_trigger.time_window
            time_aggregation         = local.requests_rules_decrease.metric_trigger.time_aggregation
            operator                 = local.requests_rules_decrease.metric_trigger.operator
            threshold                = local.requests_rules_decrease.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_decrease.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_decrease.scale_action.cooldown
            direction = local.requests_rules_decrease.scale_action.direction
            type      = local.requests_rules_decrease.scale_action.type
            value     = local.requests_rules_decrease.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  # start low load
  dynamic "profile" {
    for_each = var.scheduler.low_load == null ? [] : [1]

    content {
      name = var.scheduler.low_load.name

      capacity {
        default = var.scheduler.low_load.default
        minimum = var.scheduler.low_load.minimum
        maximum = var.scheduler.maximum
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
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_increase.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_increase.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_increase.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_increase.metric_trigger.time_grain
            statistic                = local.requests_rules_increase.metric_trigger.statistic
            time_window              = local.requests_rules_increase.metric_trigger.time_window
            time_aggregation         = local.requests_rules_increase.metric_trigger.time_aggregation
            operator                 = local.requests_rules_increase.metric_trigger.operator
            threshold                = local.requests_rules_increase.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_increase.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_increase.scale_action.cooldown
            direction = local.requests_rules_increase.scale_action.direction
            type      = local.requests_rules_increase.scale_action.type
            value     = local.requests_rules_increase.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_decrease.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_decrease.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_decrease.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_decrease.metric_trigger.time_grain
            statistic                = local.requests_rules_decrease.metric_trigger.statistic
            time_window              = local.requests_rules_decrease.metric_trigger.time_window
            time_aggregation         = local.requests_rules_decrease.metric_trigger.time_aggregation
            operator                 = local.requests_rules_decrease.metric_trigger.operator
            threshold                = local.requests_rules_decrease.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_decrease.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_decrease.scale_action.cooldown
            direction = local.requests_rules_decrease.scale_action.direction
            type      = local.requests_rules_decrease.scale_action.type
            value     = local.requests_rules_decrease.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  # end low load
  dynamic "profile" {
    for_each = var.scheduler.low_load == null ? [] : [1]

    content {
      name = "{\"name\":\"default\",\"for\":\"${var.scheduler.low_load.name}\"}"

      capacity {
        default = var.scheduler.normal_load.default
        minimum = var.scheduler.normal_load.minimum
        maximum = var.scheduler.maximum
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
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_increase.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_increase.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_increase.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_increase.metric_trigger.time_grain
            statistic                = local.requests_rules_increase.metric_trigger.statistic
            time_window              = local.requests_rules_increase.metric_trigger.time_window
            time_aggregation         = local.requests_rules_increase.metric_trigger.time_aggregation
            operator                 = local.requests_rules_increase.metric_trigger.operator
            threshold                = local.requests_rules_increase.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_increase.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_increase.scale_action.cooldown
            direction = local.requests_rules_increase.scale_action.direction
            type      = local.requests_rules_increase.scale_action.type
            value     = local.requests_rules_increase.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_decrease.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_decrease.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_decrease.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_decrease.metric_trigger.time_grain
            statistic                = local.requests_rules_decrease.metric_trigger.statistic
            time_window              = local.requests_rules_decrease.metric_trigger.time_window
            time_aggregation         = local.requests_rules_decrease.metric_trigger.time_aggregation
            operator                 = local.requests_rules_decrease.metric_trigger.operator
            threshold                = local.requests_rules_decrease.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_decrease.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_decrease.scale_action.cooldown
            direction = local.requests_rules_decrease.scale_action.direction
            type      = local.requests_rules_decrease.scale_action.type
            value     = local.requests_rules_decrease.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  # Default profile
  dynamic "profile" {
    for_each = var.scheduler.low_load == null && var.scheduler.high_load == null ? [1] : []

    content {
      name = "Default"

      capacity {
        default = var.scheduler.normal_load.default
        minimum = var.scheduler.normal_load.minimum
        maximum = var.scheduler.maximum
      }

      # Requests - increase
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_increase.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_increase.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_increase.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_increase.metric_trigger.time_grain
            statistic                = local.requests_rules_increase.metric_trigger.statistic
            time_window              = local.requests_rules_increase.metric_trigger.time_window
            time_aggregation         = local.requests_rules_increase.metric_trigger.time_aggregation
            operator                 = local.requests_rules_increase.metric_trigger.operator
            threshold                = local.requests_rules_increase.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_increase.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_increase.scale_action.cooldown
            direction = local.requests_rules_increase.scale_action.direction
            type      = local.requests_rules_increase.scale_action.type
            value     = local.requests_rules_increase.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_decrease.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_decrease.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_decrease.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_decrease.metric_trigger.time_grain
            statistic                = local.requests_rules_decrease.metric_trigger.statistic
            time_window              = local.requests_rules_decrease.metric_trigger.time_window
            time_aggregation         = local.requests_rules_decrease.metric_trigger.time_aggregation
            operator                 = local.requests_rules_decrease.metric_trigger.operator
            threshold                = local.requests_rules_decrease.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_decrease.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_decrease.scale_action.cooldown
            direction = local.requests_rules_decrease.scale_action.direction
            type      = local.requests_rules_decrease.scale_action.type
            value     = local.requests_rules_decrease.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  # Fixed Time profile
  dynamic "profile" {
    for_each = var.scheduler.spot_load == null ? [] : [1]

    content {
      name = var.scheduler.spot_load.name

      capacity {
        default = var.scheduler.spot_load.default
        minimum = var.scheduler.spot_load.minimum
        maximum = var.scheduler.maximum
      }

      fixed_date {
        timezone = "W. Europe Standard Time"
        start    = var.scheduler.spot_load.start_date
        end      = var.scheduler.spot_load.end_date
      }

      # Requests - increase
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_increase.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_increase.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_increase.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_increase.metric_trigger.time_grain
            statistic                = local.requests_rules_increase.metric_trigger.statistic
            time_window              = local.requests_rules_increase.metric_trigger.time_window
            time_aggregation         = local.requests_rules_increase.metric_trigger.time_aggregation
            operator                 = local.requests_rules_increase.metric_trigger.operator
            threshold                = local.requests_rules_increase.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_increase.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_increase.scale_action.cooldown
            direction = local.requests_rules_increase.scale_action.direction
            type      = local.requests_rules_increase.scale_action.type
            value     = local.requests_rules_increase.scale_action.value
          }
        }
      }

      # Requests - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.requests == null ? [] : [1]

        content {
          metric_trigger {
            metric_name              = local.requests_rules_decrease.metric_trigger.metric_name
            metric_resource_id       = local.requests_rules_decrease.metric_trigger.metric_resource_id
            metric_namespace         = local.requests_rules_decrease.metric_trigger.metric_namespace
            time_grain               = local.requests_rules_decrease.metric_trigger.time_grain
            statistic                = local.requests_rules_decrease.metric_trigger.statistic
            time_window              = local.requests_rules_decrease.metric_trigger.time_window
            time_aggregation         = local.requests_rules_decrease.metric_trigger.time_aggregation
            operator                 = local.requests_rules_decrease.metric_trigger.operator
            threshold                = local.requests_rules_decrease.metric_trigger.threshold
            divide_by_instance_count = local.requests_rules_decrease.metric_trigger.divide_by_instance_count
          }

          scale_action {
            cooldown  = local.requests_rules_decrease.scale_action.cooldown
            direction = local.requests_rules_decrease.scale_action.direction
            type      = local.requests_rules_decrease.scale_action.type
            value     = local.requests_rules_decrease.scale_action.value
          }
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
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
      }

      # Memory - decrease
      dynamic "rule" {
        for_each = var.scale_metrics.memory == null ? [] : [1]

        content {
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
    }
  }

  tags = var.tags
}
