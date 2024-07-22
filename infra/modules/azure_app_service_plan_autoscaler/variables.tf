variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "target_service" {
  type = object({
    app_service_name  = optional(string)
    function_app_name = optional(string)
  })

  validation {
    condition     = (var.target_service.app_service_name != null) != (var.target_service.function_app_name != null)
    error_message = "Only one between \"app_service_name\" and \"function_app_name\" can have a value. It is not possible to set both of them \"null\"."
  }
}

variable "scheduler" {
  type = object({
    high_load = optional(object({
      start = object({
        hour    = number
        minutes = number
      })
      end = object({
        hour    = number
        minutes = number
      })
      name    = string
      default = number
      minimum = number
    }), null)
    low_load = optional(object({
      start = object({
        hour    = number
        minutes = number
      })
      end = object({
        hour    = number
        minutes = number
      })
      name    = string
      default = number
      minimum = number
    }), null)
    normal_load = object({
      default = number
      minimum = number
    })
    maximum = optional(number, 30)
  })

  default = {
    high_load = {
      name = "high_load_profile"
      start = {
        hour    = 19
        minutes = 30
      }
      end = {
        hour    = 22
        minutes = 59
      }
      default = 12
      minimum = 4
    }
    low_load = {
      name = "low_load_profile"
      start = {
        hour    = 23
        minutes = 00
      }
      end = {
        hour    = 05
        minutes = 00
      }
      default = 10
      minimum = 2
    }
    normal_load = {
      default = 11
      minimum = 3
    }
    maximum = 30
  }

  description = "Set the recurrent autoscaling profiles, including start and end time ([hh]:[mm]), the minimum and maximum number of instances and the fallback (\"default\") value (used when metrics are not available for some technical issue). Outside of low/high load profile time span, \"normal\" load values are used. Each default value can be overridden."
}

variable "scale_metrics" {
  type = object({
    requests = optional(object({
      upper_threshold = number
      lower_threshold = number
      increase_by     = number
      decrease_by     = number
    }), null)
    cpu = optional(object({
      upper_threshold = optional(number, 80)
      lower_threshold = optional(number, 20)
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
    }), {})
    memory = optional(object({
      upper_threshold = optional(number, 70)
      lower_threshold = optional(number, 20)
      increase_by     = optional(number, 1)
      decrease_by     = optional(number, 1)
    }), {})
    cooldown = optional(object({
      requests_rule = optional(object({
        increase = optional(number, 1)
        decrease = optional(number, 10)
      }), {})
      cpu_rule = optional(object({
        increase = optional(number, 1)
        decrease = optional(number, 20)
      }), {})
      memory_rule = optional(object({
        increase = optional(number, 1)
        decrease = optional(number, 5)
      }), {})
    }), {})
    statistic = optional(object({
      requests_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
      cpu_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
      memory_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
    }), {})
    time_aggregation = optional(object({
      requests_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
      cpu_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
      memory_rule = optional(object({
        increase = optional(string, "Average")
        decrease = optional(string, "Average")
      }), {})
    }), {})
    time_window = optional(object({
      requests_rule = optional(object({
        increase = optional(number, 1)
        decrease = optional(number, 1)
      }), {})
      cpu_rule = optional(object({
        increase = optional(number, 5)
        decrease = optional(number, 5)
      }), {})
      memory_rule = optional(object({
        increase = optional(number, 5)
        decrease = optional(number, 5)
      }), {})
    }), {})
  })

  description = "(Optional) Set the metrics to monitor. CPU and Memory are mandatory, Requests is not. Each attribute has a default value that can be overridden"

  default = {
    requests = null
    cpu = {
      upper_threshold = 80
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    }
    memory = {
      upper_threshold = 70
      lower_threshold = 20
      increase_by     = 1
      decrease_by     = 1
    }
    cooldown = {
      requests_rule = {
        increase = 1
        decrease = 10
      }
      cpu_rule = {
        increase = 1
        decrease = 20
      }
      memory_rule = {
        increase = 1
        decrease = 5
      }
    }
    statistic = {
      requests_rule = {
        increase = "Average"
        decrease = "Average"
      }
      cpu_rule = {
        increase = "Average"
        decrease = "Average"
      }
      memory_rule = {
        increase = "Average"
        decrease = "Average"
      }
    }
    time_aggregation = {
      requests_rule = {
        increase = "Average"
        decrease = "Average"
      }
      cpu_rule = {
        increase = "Average"
        decrease = "Average"
      }
      memory_rule = {
        increase = "Average"
        decrease = "Average"
      }
    }
    time_window = {
      requests_rule = {
        increase = 1
        decrease = 1
      }
      cpu_rule = {
        increase = 5
        decrease = 5
      }
      memory_rule = {
        increase = 5
        decrease = 5
      }
    }
  }

  validation {
    condition     = var.scale_metrics.cpu != null
    error_message = "CPU metrics can't be null"
  }

  validation {
    condition     = var.scale_metrics.memory != null
    error_message = "Memory metrics can't be null"
  }

  validation {
    condition = alltrue([
      # Statistic
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.requests_rule.increase),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.requests_rule.decrease),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.cpu_rule.increase),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.cpu_rule.decrease),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.memory_rule.increase),
      contains(["Average", "Max", "Min", "Sum"], var.scale_metrics.statistic.memory_rule.decrease),
    ])
    error_message = "Each Statistic metric trigger must be one of the following values: Average, Max, Min, or Sum."
  }

  validation {
    condition = alltrue([
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.requests_rule.increase),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.requests_rule.decrease),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.cpu_rule.increase),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.cpu_rule.decrease),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.memory_rule.increase),
      contains(["Average", "Count", "Maximum", "Minimum", "Last", "Total"], var.scale_metrics.time_aggregation.memory_rule.decrease),
    ])
    error_message = "Each Time aggregation metric trigger must be one of the following values: Average, Count, Maximum, Minimum, Last or Total."
  }
}